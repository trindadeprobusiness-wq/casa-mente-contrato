-- Migration: Rental Automations (Functions & Triggers)
-- Description: Adds smart logic for generating bills and handling payment splits (fees/owner transfers).

-- =====================================================
-- 1. FUNCTION: generate_monthly_rent_bills
-- Generates bills for all active rental contracts for a specific month.
-- Usage: SELECT generate_monthly_rent_bills('2026-03-01');
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_monthly_rent_bills(reference_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    contract RECORD;
    bills_created INTEGER := 0;
    target_month_str CHAR(7);
    due_date DATE;
BEGIN
    target_month_str := TO_CHAR(reference_date, 'MM/YYYY');
    
    FOR contract IN 
        SELECT * FROM public.contratos 
        WHERE status = 'ATIVO' 
          AND tipo IN ('LOCACAO_RESIDENCIAL', 'LOCACAO_COMERCIAL')
    LOOP
        -- Check if bill already exists for this contract and month
        IF NOT EXISTS (
            SELECT 1 FROM public.faturas_aluguel 
            WHERE contrato_id = contract.id 
              AND mes_referencia = target_month_str
        ) THEN
            -- Calculate specific due date based on contract day
            -- Logic: Set year/month from reference_date, day from contract.dia_vencimento
            -- Handle potential invalid dates (e.g. Feb 30) by simple date truncation or logic if needed. 
            -- Keeping it simple: straightforward construction.
            BEGIN
                due_date := MAKE_DATE(
                    CAST(EXTRACT(YEAR FROM reference_date) AS INTEGER),
                    CAST(EXTRACT(MONTH FROM reference_date) AS INTEGER),
                    contract.dia_vencimento_aluguel
                );
            EXCEPTION WHEN OTHERS THEN
                -- Fallback to last day of month if invalid (e.g. Feb 30)
                due_date := (date_trunc('month', reference_date) + interval '1 month - 1 day')::date;
            END;

            INSERT INTO public.faturas_aluguel (
                contrato_id,
                cliente_id,
                imovel_id,
                corretor_id,
                mes_referencia,
                data_vencimento,
                valor_aluguel,
                valor_condominio, -- Should be dynamic in V2 (get from Imovel or separate table)
                valor_iptu,      -- Should be dynamic in V2
                status
            ) VALUES (
                contract.id,
                contract.cliente_id,
                contract.imovel_id,
                contract.corretor_id,
                target_month_str,
                due_date,
                contract.valor,      -- Base rent amount
                0, -- Placeholder: In real usage, these might come from variable expenses input
                0, -- Placeholder
                'PENDENTE'
            );
            
            bills_created := bills_created + 1;
        END IF;
    END LOOP;

    RETURN bills_created;
END;
$$;

-- =====================================================
-- 2. FUNCTION: handle_bill_payment
-- Trigger logic to calculate fees and owner transfer when bill is PAID.
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_bill_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_contract RECORD;
    v_admin_fee DECIMAL(15,2);
    v_owner_net DECIMAL(15,2);
    v_repasse_date DATE;
BEGIN
    -- Only run if status changed to PAGO
    IF OLD.status != 'PAGO' AND NEW.status = 'PAGO' THEN
        
        -- Get Contract Details
        SELECT * INTO v_contract FROM public.contratos WHERE id = NEW.contrato_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Contrato not found for fatura %', NEW.id;
        END IF;

        -- 1. Calculate Administration Fee (on Rent Value only, usually)
        v_admin_fee := NEW.valor_aluguel * (COALESCE(v_contract.taxa_administracao_percentual, 10.00) / 100);
        
        -- 2. Calculate Net Amount for Owner
        -- (Rent - Fee) + (Reimbursements: Condominio + IPTU + Extras)
        v_owner_net := (NEW.valor_aluguel - v_admin_fee) 
                       + COALESCE(NEW.valor_condominio, 0) 
                       + COALESCE(NEW.valor_iptu, 0)
                       + COALESCE(NEW.valor_extras, 0);

        -- 3. Determine Repasse Date
        -- Next occurrence of dia_repasse after payment or same month? 
        -- Usually: Reference Month's dia_repasse. If today is past that, set to next business day or today.
        -- Implementation: Create date based on Payment Date Month + Contract Repasse Day.
        BEGIN
            v_repasse_date := MAKE_DATE(
                CAST(EXTRACT(YEAR FROM NEW.data_pagamento) AS INTEGER),
                CAST(EXTRACT(MONTH FROM NEW.data_pagamento) AS INTEGER),
                v_contract.dia_repasse_proprietario
            );
        EXCEPTION WHEN OTHERS THEN
             v_repasse_date := NEW.data_pagamento; -- Fallback
        END;
        
        -- If calculated repasse date is before payment date (late payment), repasse ASAP (e.g. tomorrow)
        IF v_repasse_date < NEW.data_pagamento THEN
             v_repasse_date := NEW.data_pagamento + INTEGER '1';
        END IF;

        -- 4. Create Repasse Record
        INSERT INTO public.repasses_proprietario (
            fatura_origem_id,
            contrato_id,
            corretor_id,
            proprietario_nome, -- Storing name for easier history viewing
            data_prevista,
            valor_bruto_recebido,
            valor_taxa_adm,
            valor_liquido_repasse,
            status
        ) VALUES (
            NEW.id,
            v_contract.id,
            NEW.corretor_id,
            (SELECT proprietario_nome FROM public.imoveis WHERE id = NEW.imovel_id),
            v_repasse_date,
            NEW.valor_pago,
            v_admin_fee,
            v_owner_net,
            'AGENDADO'
        );

        -- 5. Register Revenue in Financial Module
        INSERT INTO public.lancamentos_financeiros (
            corretor_id,
            tipo,
            categoria,
            descricao,
            valor,
            data,
            recorrente,
            contrato_id,
            imovel_id,
            comprovante_url
        ) VALUES (
            NEW.corretor_id,
            'RECEITA',
            'COMISSAO_LOCACAO',
            'Taxa Adm - Fatura ' || NEW.mes_referencia,
            v_admin_fee,
            NEW.data_pagamento,
            TRUE,
            NEW.contrato_id,
            NEW.imovel_id,
            NEW.comprovante_url
        );

    END IF;

    RETURN NEW;
END;
$$;

-- =====================================================
-- 3. TRIGGER: tr_on_bill_paid
-- =====================================================
DROP TRIGGER IF EXISTS tr_on_bill_paid ON public.faturas_aluguel;

CREATE TRIGGER tr_on_bill_paid
    AFTER UPDATE ON public.faturas_aluguel
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_bill_payment();
