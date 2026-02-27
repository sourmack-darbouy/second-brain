'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  createSpeechRecognition,
  formatDuration,
  structureTranscript,
  toMarkdown,
  StructuredMemory,
} from '@/lib/voice-capture';

// TypeScript declarations for Web Speech API
type SpeechRecognition = any;
type SpeechRecognitionEvent = any;
type SpeechRecognitionErrorEvent = any;

interface VoiceCaptureProps {
  onSave: (content: string, structured: StructuredMemory) => void;
  onClose: () => void;
  date: string;
}

export default function VoiceCapture({ onSave, onClose, date }: VoiceCaptureProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [structured, setStructured] = useState<StructuredMemory | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const { recognition, isSupported: supported } = createSpeechRecognition();
    
    if (!supported) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    
    recognitionRef.current = recognition;
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + ' ' + finalTranscript);
      }
      setInterimTranscript(interim);
    };
    
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and try again.');
        stopRecording();
      } else if (event.error === 'no-speech') {
        // Restart if no speech detected
        if (isRecording && recognitionRef.current) {
          recognitionRef.current.stop();
          setTimeout(() => {
            if (isRecording && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        }
      }
    };
    
    recognition.onend = () => {
      // Auto-restart if still recording
      if (isRecording && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      }
    };
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setDuration(0);
    setStructured(null);
    setShowPreview(false);
    setIsRecording(true);
    startTimeRef.current = Date.now();
    
    try {
      recognitionRef.current.start();
      
      durationIntervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (e) {
      console.error('Failed to start recording:', e);
      setError('Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    
    setIsRecording(false);
    recognitionRef.current.stop();
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    // Structure the transcript
    const fullTranscript = (transcript + ' ' + interimTranscript).trim();
    if (fullTranscript.length > 10) {
      const structuredResult = structureTranscript(fullTranscript);
      setStructured(structuredResult);
      setShowPreview(true);
      setEditedTranscript(fullTranscript);
    }
  }, [transcript, interimTranscript]);

  const handleSave = () => {
    if (!structured) return;
    
    const finalTranscript = editMode ? editedTranscript : transcript;
    const finalStructured = editMode ? structureTranscript(finalTranscript) : structured;
    const markdown = toMarkdown(finalStructured, date);
    
    onSave(markdown, finalStructured);
    onClose();
  };

  const handleReRecord = () => {
    setShowPreview(false);
    setStructured(null);
    setTranscript('');
    setInterimTranscript('');
    setEditMode(false);
  };

  // Type icons
  const typeIcons: Record<StructuredMemory['type'], string> = {
    meeting: '📅',
    call: '📞',
    note: '📝',
    idea: '💡',
    reminder: '⏰',
  };

  const typeColors: Record<StructuredMemory['type'], string> = {
    meeting: 'bg-blue-600',
    call: 'bg-green-600',
    note: 'bg-zinc-600',
    idea: 'bg-yellow-600',
    reminder: 'bg-orange-600',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto border border-zinc-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            🎙️ Voice Capture
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-2">
            ✕
          </button>
        </div>

        {!isSupported && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
            <p className="text-sm text-zinc-400 mt-2">
              Supported browsers: Chrome, Edge, Safari (macOS)
            </p>
          </div>
        )}

        {error && isSupported && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!showPreview ? (
          <>
            {/* Recording Interface */}
            <div className="flex flex-col items-center py-8">
              {/* Timer */}
              <div className="text-5xl font-mono text-zinc-400 mb-8">
                {formatDuration(duration)}
              </div>

              {/* Record Button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isSupported}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : 'bg-blue-600 hover:bg-blue-700'
                } ${!isSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording ? (
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
              </button>

              <p className="text-zinc-400 mt-4">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>

              {/* Live Transcript */}
              {(transcript || interimTranscript) && (
                <div className="w-full mt-6 p-4 bg-zinc-800 rounded-lg">
                  <div className="text-xs text-zinc-500 mb-2">Live transcript:</div>
                  <p className="text-zinc-300">
                    {transcript}
                    <span className="text-zinc-500">{interimTranscript}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="border-t border-zinc-700 pt-4 mt-4">
              <p className="text-xs text-zinc-500">
                💡 <strong>Tips:</strong> Speak clearly. Mention names with "with [Name]" or "[Name] said". 
                Say "need to", "follow up", or "remember to" for action items.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Preview & Edit Interface */}
            {structured && (
              <>
                {/* Detected Type */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${typeColors[structured.type]} text-white`}>
                    {typeIcons[structured.type]} {structured.type.charAt(0).toUpperCase() + structured.type.slice(1)}
                  </span>
                  <span className="text-zinc-400 text-sm">{formatDuration(duration)}</span>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <label className="text-sm text-zinc-400 mb-1 block">Title</label>
                  <input
                    type="text"
                    value={structured.title}
                    onChange={(e) => setStructured({ ...structured, title: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
                  />
                </div>

                {/* Summary */}
                {structured.summary && (
                  <div className="mb-4">
                    <label className="text-sm text-zinc-400 mb-1 block">Summary</label>
                    <p className="text-zinc-300 bg-zinc-800 p-3 rounded-lg">{structured.summary}</p>
                  </div>
                )}

                {/* Detected Contacts */}
                {structured.contacts.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm text-zinc-400 mb-1 block">Detected People</label>
                    <div className="flex flex-wrap gap-2">
                      {structured.contacts.map((contact, i) => (
                        <span key={i} className="bg-blue-600/30 text-blue-300 px-2 py-1 rounded text-sm">
                          @{contact}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Items */}
                {structured.actionItems.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm text-zinc-400 mb-1 block">Action Items</label>
                    <div className="space-y-2">
                      {structured.actionItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-800 p-2 rounded">
                          <input type="checkbox" className="rounded border-zinc-600" />
                          <span className="text-zinc-300 flex-1">{item.text}</span>
                          {item.dueDate && (
                            <span className="text-xs text-orange-400">by {item.dueDate}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {structured.tags.length > 0 && (
                  <div className="mb-4">
                    <label className="text-sm text-zinc-400 mb-1 block">Suggested Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {structured.tags.map((tag, i) => (
                        <span key={i} className="bg-purple-600/30 text-purple-300 px-2 py-1 rounded text-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Transcript Toggle */}
                <div className="mb-4">
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="text-sm text-zinc-400 hover:text-zinc-300 flex items-center gap-2"
                  >
                    📝 {editMode ? 'Hide' : 'Edit'} Transcript
                  </button>
                </div>

                {/* Transcript Editor */}
                {editMode && (
                  <div className="mb-4">
                    <label className="text-sm text-zinc-400 mb-1 block">Edit Transcript</label>
                    <textarea
                      value={editedTranscript}
                      onChange={(e) => {
                        setEditedTranscript(e.target.value);
                        // Re-structure on change
                        const newStructured = structureTranscript(e.target.value);
                        setStructured(newStructured);
                      }}
                      rows={5}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-700">
                  <button
                    onClick={handleReRecord}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 py-3 rounded-lg font-medium"
                  >
                    🔄 Re-record
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-medium"
                  >
                    ✓ Save to Memory
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
