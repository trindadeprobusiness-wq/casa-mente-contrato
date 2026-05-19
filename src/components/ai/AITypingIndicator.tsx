export function AITypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 bg-muted w-max rounded-2xl rounded-bl-md px-4 py-3">
      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
