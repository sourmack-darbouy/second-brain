'use client';

import { useState, useEffect } from 'react';

interface PromptProps {
  onSave: (content: string) => void;
  onClose: () => void;
}

const PROMPTS = [
  {
    question: "What did you work on today?",
    placeholder: "Meetings, tasks, progress...",
    template: "## Today's Work\n\n",
    icon: "💼",
  },
  {
    question: "Who did you talk to?",
    placeholder: "Names, companies, topics...",
    template: "## Conversations\n\n",
    icon: "👥",
  },
  {
    question: "What did you learn?",
    placeholder: "New insights, lessons...",
    template: "## Learnings\n\n",
    icon: "💡",
  },
  {
    question: "What's on your mind?",
    placeholder: "Ideas, concerns, thoughts...",
    template: "## Thoughts\n\n",
    icon: "🧠",
  },
  {
    question: "What do you need to follow up on?",
    placeholder: "Tasks, people, deadlines...",
    template: "## Follow-ups\n\n- [ ] ",
    icon: "✅",
  },
];

export default function MemoryPrompts({ onSave, onClose }: PromptProps) {
  const [currentPrompt, setCurrentPrompt] = useState(0);
  const [responses, setResponses] = useState<string[]>(['', '', '', '', '']);
  const [showSummary, setShowSummary] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [finalContent, setFinalContent] = useState('');

  const prompt = PROMPTS[currentPrompt];
  const isLastPrompt = currentPrompt === PROMPTS.length - 1;
  const hasContent = responses[currentPrompt]?.trim();

  const handleNext = () => {
    if (isLastPrompt) {
      generateSummary();
    } else {
      setCurrentPrompt(currentPrompt + 1);
    }
  };

  const handleBack = () => {
    if (currentPrompt > 0) {
      setCurrentPrompt(currentPrompt - 1);
    }
  };

  const handleSkip = () => {
    if (isLastPrompt) {
      generateSummary();
    } else {
      setCurrentPrompt(currentPrompt + 1);
    }
  };

  const generateSummary = () => {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const lines: string[] = [];
    lines.push(`# Daily Reflection - ${today}`);
    lines.push('');
    
    PROMPTS.forEach((p, i) => {
      if (responses[i]?.trim()) {
        lines.push(p.template + responses[i].trim());
        lines.push('');
      }
    });
    
    lines.push(`_Reflected at ${new Date().toLocaleTimeString()}_`);
    
    setFinalContent(lines.join('\n').trim());
    setShowSummary(true);
  };

  const handleSave = () => {
    onSave(finalContent);
    onClose();
  };

  const progress = ((currentPrompt + 1) / PROMPTS.length) * 100;

  // Summary view
  if (showSummary) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto border border-zinc-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">📝 Your Daily Reflection</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">✕</button>
          </div>

          {!editingSummary ? (
            <div className="bg-zinc-800 rounded-lg p-4 mb-6">
              <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono">
                {finalContent}
              </pre>
            </div>
          ) : (
            <textarea
              value={finalContent}
              onChange={(e) => setFinalContent(e.target.value)}
              className="w-full h-64 bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-sm font-mono text-zinc-300 mb-6"
            />
          )}

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setEditingSummary(!editingSummary)}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-3 rounded-lg"
            >
              {editingSummary ? '👁️ Preview' : '✏️ Edit'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium"
            >
              ✓ Save to Memory
            </button>
          </div>

          <p className="text-center text-xs text-zinc-500">
            This will be saved as today's daily reflection
          </p>
        </div>
      </div>
    );
  }

  // Prompt view
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg p-6 max-w-lg w-full border border-zinc-700">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Prompt {currentPrompt + 1} of {PROMPTS.length}</span>
            <button onClick={handleSkip} className="hover:text-white">Skip</button>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">{prompt.icon}</div>
          <h3 className="text-xl font-semibold">{prompt.question}</h3>
        </div>

        {/* Response */}
        <textarea
          value={responses[currentPrompt]}
          onChange={(e) => {
            const newResponses = [...responses];
            newResponses[currentPrompt] = e.target.value;
            setResponses(newResponses);
          }}
          placeholder={prompt.placeholder}
          className="w-full h-40 bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-zinc-100 placeholder-zinc-500 resize-none mb-6 focus:outline-none focus:border-blue-500"
          autoFocus
        />

        {/* Navigation */}
        <div className="flex gap-3">
          {currentPrompt > 0 && (
            <button
              onClick={handleBack}
              className="bg-zinc-700 hover:bg-zinc-600 px-6 py-3 rounded-lg"
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium"
          >
            {isLastPrompt ? 'Generate Summary →' : 'Next →'}
          </button>
        </div>

        {/* Quick skip to end */}
        <button
          onClick={() => {
            setCurrentPrompt(PROMPTS.length - 1);
          }}
          className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 mt-4"
        >
          Skip all → Generate summary
        </button>
      </div>
    </div>
  );
}
