import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, X, MessageSquare, Loader2 } from 'lucide-react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { AppData, Member, Investment, Expense, SavingsLog } from '../types';
import { fmt, monthNumToLabel } from '../utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  db: AppData;
  setDb: (updater: AppData | ((prev: AppData) => AppData)) => Promise<void>;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const AIChat: React.FC<AIChatProps> = ({ db, setDb, isAdmin, isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am your Bondhu Circle AI assistant. Ask me anything about your investments, savings, or expenses!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'AI features are unavailable — GEMINI_API_KEY is not set. Please add it in your hosting provider\'s environment variables.' }]);
        setIsLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
      
      const addMemberTool: FunctionDeclaration = {
        name: "addMember",
        description: "Add a new member to the group",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full name of the member" },
            units: { type: Type.NUMBER, description: "Number of units (default 1)" },
            joinMonth: { type: Type.NUMBER, description: "Month number they joined (default current month)" },
            phone: { type: Type.STRING, description: "Phone number (optional)" }
          },
          required: ["name"]
        }
      };

      const deleteMemberTool: FunctionDeclaration = {
        name: "deleteMember",
        description: "Remove a member from the group",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.NUMBER, description: "ID of the member to delete" }
          },
          required: ["id"]
        }
      };

      const updateMemberTool: FunctionDeclaration = {
        name: "updateMember",
        description: "Update member details (e.g. units, phone)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.NUMBER, description: "ID of the member to update" },
            units: { type: Type.NUMBER, description: "New number of units" },
            phone: { type: Type.STRING, description: "New phone number" }
          },
          required: ["id"]
        }
      };

      const addInvestmentTool: FunctionDeclaration = {
        name: "addInvestment",
        description: "Add a new investment project",
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Name of the investment project" },
            amount: { type: Type.NUMBER, description: "Total investment amount in tk" },
            month: { type: Type.NUMBER, description: "Month number" },
            rate: { type: Type.NUMBER, description: "Initial profit rate percentage" }
          },
          required: ["name", "amount", "month", "rate"]
        }
      };

      const deleteInvestmentTool: FunctionDeclaration = {
        name: "deleteInvestment",
        description: "Remove an investment project",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "ID of the investment to delete" }
          },
          required: ["id"]
        }
      };

      const updateInvestmentRateTool: FunctionDeclaration = {
        name: "updateInvestmentRate",
        description: "Update the profit rate of an investment",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "ID of the investment" },
            rate: { type: Type.NUMBER, description: "New profit rate percentage" }
          },
          required: ["id", "rate"]
        }
      };

      const addExpenseTool: FunctionDeclaration = {
        name: "addExpense",
        description: "Add a new expense",
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "Category (e.g. Office, Food, Travel, Other)" },
            amount: { type: Type.NUMBER, description: "Amount in tk" },
            month: { type: Type.NUMBER, description: "Month number" },
            description: { type: Type.STRING, description: "Optional description" }
          },
          required: ["category", "amount", "month"]
        }
      };

      const deleteExpenseTool: FunctionDeclaration = {
        name: "deleteExpense",
        description: "Remove an expense",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "ID of the expense to delete" }
          },
          required: ["id"]
        }
      };

      const addWithdrawalTool: FunctionDeclaration = {
        name: "addWithdrawal",
        description: "Log a member withdrawal",
        parameters: {
          type: Type.OBJECT,
          properties: {
            memberId: { type: Type.NUMBER, description: "ID of the member" },
            amount: { type: Type.NUMBER, description: "Amount in tk" },
            month: { type: Type.NUMBER, description: "Month number" },
            sourceType: { type: Type.STRING, description: "Source: 'uninvested', 'profit', or 'investment'" },
            sourceId: { type: Type.STRING, description: "Investment ID if sourceType is 'investment'" },
            note: { type: Type.STRING, description: "Optional reason" }
          },
          required: ["memberId", "amount", "month", "sourceType"]
        }
      };

      const deleteWithdrawalTool: FunctionDeclaration = {
        name: "deleteWithdrawal",
        description: "Remove a withdrawal record",
        parameters: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "ID of the withdrawal to delete" }
          },
          required: ["id"]
        }
      };

      const updateConfigTool: FunctionDeclaration = {
        name: "updateConfig",
        description: "Update global configuration (unit value, current month)",
        parameters: {
          type: Type.OBJECT,
          properties: {
            unitValue: { type: Type.NUMBER, description: "New unit value in tk" },
            currentMonth: { type: Type.NUMBER, description: "New current month number" }
          }
        }
      };

      const adminTools = [
        addMemberTool, deleteMemberTool, updateMemberTool,
        addInvestmentTool, deleteInvestmentTool, updateInvestmentRateTool,
        addExpenseTool, deleteExpenseTool, 
        addWithdrawalTool, deleteWithdrawalTool,
        updateConfigTool
      ];

      // Prepare context
      const context = `
        You are a financial assistant for "Bondhu Circle", an investment group.
        Current User Role: ${isAdmin ? 'ADMIN (Worker Mode)' : 'MEMBER (Read-Only Mode)'}
        Current Month: ${monthNumToLabel(db.currentMonth)} (Month ${db.currentMonth})
        
        Data Summary:
        - Members: ${db.members.map(m => `${m.name} (ID: ${m.id}, ${m.units} units, joined month ${m.joinMonth})`).join(', ')}
        - Total Members: ${db.members.length}
        - Unit Value: ${db.unitValue} tk
        - Total Investments: ${db.investments.length}
        - Total Expenses: ${db.expenses.reduce((s, e) => s + e.amount, 0)} tk
        
        Detailed Investments:
        ${db.investments.map(inv => `- ${inv.name} (ID: ${inv.id}): ${fmt(inv.sources.reduce((s, src) => s + src.amount, 0))} tk (Month ${inv.month}, Rate ${inv.rate}%)`).join('\n')}
        
        Instructions:
        - Answer questions based on the provided data.
        - ${isAdmin 
          ? "You are in ADMIN mode. You can perform actions like adding/deleting members, investments, and expenses using the provided tools. Confirm actions to the user." 
          : "You are in MEMBER mode. You CANNOT perform any actions. You can only answer questions, provide analysis, and chat. If the user asks you to perform an action, politely explain that you don't have permission in member view."}
        - Be concise and helpful.
        - Use "tk" for currency.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: [
          { role: 'user', parts: [{ text: context }] },
          ...messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          tools: isAdmin ? [{ functionDeclarations: adminTools }] : []
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const fc of functionCalls) {
          const args = fc.args as any;
          if (fc.name === 'addMember') {
            setDb(prev => ({
              ...prev,
              members: [
                ...prev.members,
                {
                  id: prev.nextMemberId,
                  name: args.name,
                  units: args.units || 1,
                  joinMonth: args.joinMonth || prev.currentMonth,
                  phone: args.phone || ''
                }
              ],
              nextMemberId: prev.nextMemberId + 1
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've successfully added ${args.name} as a new member with ${args.units || 1} unit(s).` }]);
          } else if (fc.name === 'deleteMember') {
            setDb(prev => ({
              ...prev,
              members: prev.members.filter(m => m.id !== args.id)
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've removed member with ID ${args.id}.` }]);
          } else if (fc.name === 'updateMember') {
            setDb(prev => ({
              ...prev,
              members: prev.members.map(m => m.id === args.id ? {
                ...m,
                units: args.units !== undefined ? args.units : m.units,
                phone: args.phone !== undefined ? args.phone : m.phone
              } : m)
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've updated member with ID ${args.id}.` }]);
          } else if (fc.name === 'addInvestment') {
            setDb(prev => ({
              ...prev,
              investments: [
                ...prev.investments,
                {
                  id: `inv-${prev.nextInvId}`,
                  name: args.name,
                  month: args.month,
                  rate: args.rate,
                  sources: [{ type: 'saving', memberId: null, amount: args.amount }] // Simplified source for AI addition
                }
              ],
              nextInvId: prev.nextInvId + 1
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've added a new investment project: ${args.name} (${fmt(args.amount)} tk).` }]);
          } else if (fc.name === 'deleteInvestment') {
            setDb(prev => ({
              ...prev,
              investments: prev.investments.filter(i => i.id !== args.id)
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've removed investment with ID ${args.id}.` }]);
          } else if (fc.name === 'updateInvestmentRate') {
            setDb(prev => ({
              ...prev,
              investments: prev.investments.map(i => i.id === args.id ? { ...i, rate: args.rate } : i)
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've updated the profit rate for investment ${args.id} to ${args.rate}%.` }]);
          } else if (fc.name === 'addExpense') {
            setDb(prev => ({
              ...prev,
              expenses: [
                ...prev.expenses,
                {
                  id: `exp-${prev.nextExpId}`,
                  category: args.category,
                  amount: args.amount,
                  month: args.month,
                  description: args.description || ''
                }
              ],
              nextExpId: prev.nextExpId + 1
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've logged an expense of ${fmt(args.amount)} tk for ${args.category}.` }]);
          } else if (fc.name === 'deleteExpense') {
            setDb(prev => ({
              ...prev,
              expenses: prev.expenses.filter(e => e.id !== args.id)
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've removed expense with ID ${args.id}.` }]);
          } else if (fc.name === 'updateConfig') {
            setDb(prev => ({
              ...prev,
              unitValue: args.unitValue !== undefined ? args.unitValue : prev.unitValue,
              currentMonth: args.currentMonth !== undefined ? args.currentMonth : prev.currentMonth
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've updated the global configuration.` }]);
          } else if (fc.name === 'addWithdrawal') {
            setDb(prev => ({
              ...prev,
              withdrawals: [
                ...prev.withdrawals,
                {
                  id: `wth-${Date.now()}`,
                  memberId: args.memberId,
                  amount: args.amount,
                  month: args.month,
                  sourceType: args.sourceType,
                  sourceId: args.sourceId,
                  note: args.note
                }
              ]
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've logged a withdrawal of ${fmt(args.amount)} tk for member ${args.memberId} from ${args.sourceType}.` }]);
          } else if (fc.name === 'deleteWithdrawal') {
            setDb(prev => ({
              ...prev,
              withdrawals: prev.withdrawals.filter(w => w.id !== args.id)
            }));
            setMessages(prev => [...prev, { role: 'assistant', content: `I've removed withdrawal with ID ${args.id}.` }]);
          }
        }
        return;
      }

      const aiText = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'assistant', content: aiText }]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your API key or try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 w-[calc(100vw-48px)] sm:w-[340px] h-[500px] max-h-[80vh] bg-[var(--bg)] border border-[var(--border)] rounded-2xl shadow-2xl z-[100] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg2)] flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
                <Bot size={20} />
              </div>
              <div>
                <div className="text-[14px] font-bold text-[var(--text)]">Bondhu AI</div>
                <div className="text-[11px] text-[var(--accent)] font-medium">Online</div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text3)]">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-[var(--bg3)] text-[var(--text2)]' : 'bg-[var(--accent)] text-white'}`}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-3 rounded-2xl text-[13px] leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-[var(--accent)] text-white rounded-tr-none' 
                      : 'bg-[var(--bg2)] text-[var(--text)] border border-[var(--border)] rounded-tl-none'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="bg-[var(--bg2)] border border-[var(--border)] p-3 rounded-2xl rounded-tl-none">
                    <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg2)]">
            <div className="relative">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me anything..."
                className="w-full pr-12 py-3 bg-[var(--bg)] border-[var(--border)] focus:border-[var(--accent)] rounded-xl text-[13px]"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--accent)] disabled:opacity-50 hover:bg-[var(--accent)] hover:text-white rounded-lg transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
