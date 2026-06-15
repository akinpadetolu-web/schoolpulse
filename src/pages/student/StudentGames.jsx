import React from 'react';
import { Gamepad2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GAMES = [
  {
    id: 'mathsnake',
    name: 'MathSnake',
    description: 'Practice math while playing the classic snake game!',
    url: 'https://mathsnake.schooledupulse.com',
    emoji: '🐍',
    tag: 'Math',
  },
];

export default function StudentGames() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-primary" /> Games
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Fun educational games to sharpen your skills</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map(game => (
          <div key={game.id} className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="bg-primary/10 flex items-center justify-center h-32 text-6xl">
              {game.emoji}
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-base">{game.name}</h2>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{game.tag}</span>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{game.description}</p>
              <Button
                className="mt-4 w-full"
                onClick={() => window.open(game.url, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Play Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}