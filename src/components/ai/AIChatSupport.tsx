import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function AIChatSupport() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Olá! Sou sua IA de suporte. Posso ajudar a analisar dados, criar contratos ou tirar dúvidas. Como posso ajudar hoje?',
            timestamp: new Date(),
        },
    ]);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        setIsTyping(true);

        // Mock AI Response Logic
        // In a real implementation, this would call an Edge Function or API
        setTimeout(() => {
            const response: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: generateMockResponse(userMessage.content),
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, response]);
            setIsTyping(false);
        }, 1500);
    };

    const generateMockResponse = (input: string): string => {
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('faturamento') || lowerInput.includes('receita')) {
            return 'Baseado nos dados do financeiro, sua receita este mês está positiva! Posso gerar um relatório detalhado se quiser.';
        }
        if (lowerInput.includes('contrato')) {
            return 'Para criar um novo contrato, vá até a aba Jurídico ou use o botão rápido "Novo Contrato". Posso guiar você no processo.';
        }
        if (lowerInput.includes('lucro')) {
            return 'O lucro líquido projetado para este ano mostra uma tendência de crescimento de 15%.';
        }
        return 'Entendi. No momento estou em modo de demonstração, mas em breve estarei conectado a todos os dados do seu sistema para fornecer respostas precisas e instantâneas!';
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-4">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[350px] h-[500px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <CardHeader className="bg-primary/5 p-4 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-medium text-primary">IA Assistant</CardTitle>
                                <p className="text-xs text-muted-foreground">Online</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <Minimize2 className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden">
                        <ScrollArea className="h-full p-4">
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                            message.role === "user"
                                                ? "ml-auto bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                    >
                                        {message.content}
                                        <span className="text-[10px] opacity-50 self-end">
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex items-center gap-1 bg-muted w-max rounded-lg px-3 py-2">
                                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" />
                                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                                        <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>

                    <CardFooter className="p-3 bg-background border-t">
                        <form
                            className="flex w-full items-center space-x-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                        >
                            <Input
                                placeholder="Pergunte algo..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="flex-1"
                                disabled={isTyping}
                            />
                            <Button type="submit" size="icon" disabled={!inputText.trim() || isTyping}>
                                <Send className="h-4 w-4" />
                                <span className="sr-only">Enviar</span>
                            </Button>
                        </form>
                    </CardFooter>
                </Card>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    size="lg"
                    className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all hover:scale-110"
                >
                    <Bot className="h-8 w-8" />
                </Button>
            )}
        </div>
    );
}
