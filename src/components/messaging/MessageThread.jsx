import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

export default function MessageThread({ messages, currentUserRole }) {
  const sorted = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  return (
    <div className="space-y-3">
      {sorted.map(msg => (
        <Card key={msg.id} className={currentUserRole === msg.senderRole ? 'bg-primary/5' : 'bg-secondary/20'}>
          <CardContent className="pt-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-sm">{msg.senderName}</p>
                <p className="text-xs text-muted-foreground">{msg.senderRole}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(msg.created_date), { addSuffix: true })}
              </p>
            </div>
            {msg.subject && <p className="text-sm font-semibold mb-1">{msg.subject}</p>}
            <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}