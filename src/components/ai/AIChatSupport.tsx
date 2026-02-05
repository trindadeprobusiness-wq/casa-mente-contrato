import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Minimize2, Paperclip, File as FileIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
    attachment?: {
        name: string;
        url: string;
        type: 'image' | 'file';
    };
    timestamp: Date;
}

export function AIChatSupport() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'Olá! Sou sua IA de suporte. Posso ajudar a analisar dados, contratos ou imagens. Anexe um arquivo se precisar!',
            timestamp: new Date(),
        },
    ]);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('O arquivo deve ter no máximo 5MB');
                return;
            }
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => setFilePreview(e.target?.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const clearAttachment = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async () => {
        if (!inputText.trim() && !selectedFile) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputText,
            attachment: selectedFile ? {
                name: selectedFile.name,
                url: filePreview || '',
                type: selectedFile.type.startsWith('image/') ? 'image' : 'file'
            } : undefined,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputText('');
        const fileToUpload = selectedFile;
        const isImage = selectedFile?.type.startsWith('image/');
        clearAttachment();
        setIsTyping(true);

        try {
            let attachmentUrl = null;

            if (fileToUpload) {
                const fileExt = fileToUpload.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('chat-attachments')
                    .upload(fileName, fileToUpload);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('chat-attachments')
                    .getPublicUrl(fileName);

                attachmentUrl = data.publicUrl;
            }

            const { data, error } = await supabase.functions.invoke('ai-chat', {
                body: {
                    message: userMessage.content,
                    attachmentUrl: attachmentUrl,
                    attachmentType: isImage ? 'image' : 'file'
                }
            });

            if (error) throw error;

            const response: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.reply || "Não consegui gerar uma resposta.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, response]);

        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Erro ao conectar com a IA.');
            const errorResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };



    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-4">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[380px] h-[600px] flex flex-col shadow-2xl border-primary/20 animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <CardHeader className="bg-primary/5 p-4 flex flex-row items-center justify-between space-y-0 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <div className="bg-primary/10 p-2 rounded-full">
                                <Sparkles className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-medium text-primary">IA Assistant</CardTitle>
                                <p className="text-xs text-muted-foreground">Powered by Gemini</p>
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
                                            "flex w-max max-w-[85%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                                            message.role === "user"
                                                ? "ml-auto bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                    >
                                        {message.attachment && (
                                            <div className="mb-2 rounded-md overflow-hidden bg-background/20 p-1">
                                                {message.attachment.type === 'image' ? (
                                                    <img
                                                        src={message.attachment.url}
                                                        alt="Attachment"
                                                        className="max-h-[150px] w-auto object-cover rounded"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2 p-2">
                                                        <FileIcon className="h-4 w-4" />
                                                        <span className="text-xs underline truncate max-w-[150px]">
                                                            {message.attachment.name}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {message.content}
                                        <span className="text-[10px] opacity-70 self-end">
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

                    <CardFooter className="p-3 bg-background border-t flex-col gap-2">
                        {/* Preview Section */}
                        {selectedFile && (
                            <div className="w-full flex items-center justify-between bg-muted/50 p-2 rounded-md border text-xs">
                                <div className="flex items-center gap-2 truncate">
                                    {filePreview ? (
                                        <img src={filePreview} alt="Preview" className="h-8 w-8 object-cover rounded" />
                                    ) : (
                                        <FileIcon className="h-4 w-4" />
                                    )}
                                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearAttachment}>
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        )}

                        <form
                            className="flex w-full items-end gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileSelect}
                                accept="image/*,.pdf,.txt,.csv"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                className="shrink-0"
                                title="Anexar arquivo"
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>

                            <Input
                                placeholder="Pergunte algo ou anexe um arquivo..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="flex-1"
                                disabled={isTyping}
                            />
                            <Button type="submit" size="icon" disabled={(!inputText.trim() && !selectedFile) || isTyping}>
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
