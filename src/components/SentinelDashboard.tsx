import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Settings, 
  Activity, 
  Zap, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Play,
  Layers,
  Cpu,
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  CreditCard,
  MessageSquare,
  Send,
  User as UserIcon,
  Users,
  Clock,
  X,
  Maximize2,
  Code,
  MoreVertical,
  Download,
  FileCode,
  FileImage,
  Presentation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { SentinelLogic, SentinelPolicy, DEFAULT_POLICIES, SentinelResult } from '../lib/sentinel';
import { useAuth } from '../AuthContext';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Pricing } from './Pricing';
import { Modal } from './ui/Modal';
import { signOut } from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc,
  deleteDoc,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const ALL_MODELS = [
  // Free (4)
  { id: 'GPT-4o-mini', plan: 'free', utility: 'text' },
  { id: 'Gemini 2.0 Flash', plan: 'free', utility: 'text' },
  { id: 'Claude 3.5 Haiku', plan: 'free', utility: 'text' },
  { id: 'Llama 3.1 70B', plan: 'free', utility: 'text' },
  
  // Pro (+3, total 7)
  { id: 'Mistral Large 2', plan: 'pro', utility: 'text' },
  { id: 'Stable Diffusion 3.5', plan: 'pro', utility: 'image' },
  { id: 'DALL-E 3', plan: 'pro', utility: 'image' },

  // Enterprise (total 25)
  { id: 'GPT-5.4 (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'GPT-4o (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'OpenAI o1 (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'Claude 4.5 Sonnet (Enterprise)', plan: 'enterprise', utility: 'code' },
  { id: 'Claude 4.5 Haiku (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'Claude Opus 4.6 (Enterprise)', plan: 'enterprise', utility: 'code' },
  { id: 'Claude 3.5 Sonnet (Enterprise)', plan: 'enterprise', utility: 'code' },
  { id: 'Google Gemini 3 (Enterprise)', plan: 'enterprise', utility: 'code' },
  { id: 'Grok 4.2 (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'Llama 3.3 (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'Llama 3.1 405B (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'GLM 5 (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'DeepSeek-V3 (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'DeepSeek-R1 (Enterprise)', plan: 'enterprise', utility: 'text' },
  { id: 'Anthropic Claude 3 Opus (Enterprise)', plan: 'enterprise', utility: 'code' },
  { id: 'Midjourney v6.1 (Enterprise)', plan: 'enterprise', utility: 'image' },
  { id: 'Flux.1 [pro] (Enterprise)', plan: 'enterprise', utility: 'image' },
  { id: 'Sora 2 (Enterprise)', plan: 'enterprise', utility: 'video' },
  { id: 'Kling 3.0 (Enterprise)', plan: 'enterprise', utility: 'video' },
  { id: 'Grok Imagine (Enterprise)', plan: 'enterprise', utility: 'video' },
  { id: 'Runway Gen-3 Alpha (Enterprise)', plan: 'enterprise', utility: 'video' },
  { id: 'Pika 1.5 (Enterprise)', plan: 'enterprise', utility: 'video' },
  { id: 'HeyGen Video Creator (Enterprise)', plan: 'enterprise', utility: 'video' },
  { id: 'BioRender Connector (Enterprise)', plan: 'enterprise', utility: 'biorender' },
  { id: 'Gamma AI Slides (Enterprise)', plan: 'enterprise', utility: 'slides' },
  { id: '10Web Site Builder (Enterprise)', plan: 'enterprise', utility: 'code' },
  { id: 'Cursor AI Coding (Enterprise)', plan: 'enterprise', utility: 'code' },
  { id: 'SenMax (Enterprise)', plan: 'enterprise', utility: 'auto' },
  { id: 'ElevenLabs Multi-Voice (Enterprise)', plan: 'enterprise', utility: 'audio' },
  { id: 'Perplexity Pro (Enterprise)', plan: 'enterprise', utility: 'text' }
];

const SentinelDashboard = () => {
  const { user, subscription, organization } = useAuth();
  const [policies, setPolicies] = useState<SentinelPolicy[]>(DEFAULT_POLICIES);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'policies' | 'playground' | 'billing' | 'audit' | 'organization'>('dashboard');
  const [orgName, setOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isForwarding, setIsForwarding] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<SentinelResult | null>(null);
  const [targetResponse, setTargetResponse] = useState<any | null>(null);
  const [targetModel, setTargetModel] = useState('GPT-4o-mini');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [sidePanelWidth, setSidePanelWidth] = useState(800);
  const [isResizing, setIsResizing] = useState(false);
  const [sidePanelContent, setSidePanelContent] = useState<any>(null);
  const [sidePanelTab, setSidePanelTab] = useState<'preview' | 'code'>('preview');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [chunkedContent, setChunkedContent] = useState<Record<string, string>>({});
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const CHAT_PROMPTS = [
    "Explain quantum computing like I'm five.",
    "Write a short story about a time-traveling toaster.",
    "Give me 5 creative ideas for a weekend project.",
    "What are the top 3 benefits of using AI in healthcare?",
    "Draft a professional email to a client about a project delay.",
    "Tell me a joke about a robot walk into a bar.",
    "Summarize the plot of Inception in 3 sentences."
  ];

  const SLIDESHOW_PROMPTS = [
    "Create a 5-slide presentation on the history of space exploration.",
    "Generate a slideshow about the impact of climate change on oceans.",
    "Build a presentation for a startup pitch about a new coffee app.",
    "Create a deck explaining the basics of machine learning.",
    "Generate a 4-slide presentation on the benefits of remote work.",
    "Create a slideshow about the future of artificial intelligence.",
    "Generate a presentation on the importance of mental health."
  ];

  const BIO_PROMPTS = [
    "Search for a diagram of a human cell with organelles labeled.",
    "Find BioRender icons for CRISPR-Cas9 gene editing.",
    "Suggest a figure template for a metabolic pathway overview.",
    "Find a diagram of the human heart's electrical system.",
    "Search for icons related to neurobiology and synapses.",
    "Suggest a BioRender template for a clinical trial workflow.",
    "Find a diagram of the SARS-CoV-2 virus structure."
  ];

  const handleQuickPrompt = (type: 'chat' | 'slideshow' | 'biorender') => {
    const prompts = type === 'chat' ? CHAT_PROMPTS : type === 'slideshow' ? SLIDESHOW_PROMPTS : BIO_PROMPTS;
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    setInputPrompt(randomPrompt);
    if (type === 'biorender') {
      setTargetModel('BioRender Connector (Enterprise)');
    } else if (type === 'slideshow') {
      setTargetModel('Gamma AI Slides (Enterprise)');
    } else {
      setTargetModel('GPT-4o-mini');
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadMenu(false);
  };

  const downloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setShowDownloadMenu(false);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 400 && newWidth < window.innerWidth - 100) {
        setSidePanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const availableModels = ALL_MODELS.filter(m => {
    if (subscription?.plan === 'enterprise') return true;
    if (subscription?.plan === 'pro') return m.plan === 'free' || m.plan === 'pro';
    return m.plan === 'free';
  });
  
  // Chat & History State
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSessionId) return;
    
    messages.forEach(async (msg) => {
      if (msg.isChunked && !msg.content && !chunkedContent[msg.id]) {
        try {
          const chunksSnap = await getDocs(query(
            collection(db, 'sessions', activeSessionId, 'messages', msg.id, 'chunks'),
            orderBy('index', 'asc')
          ));
          const fullContent = chunksSnap.docs.map(d => d.data().data).join('');
          setChunkedContent(prev => ({ ...prev, [msg.id]: fullContent }));
        } catch (error) {
          console.error("Error loading chunks:", error);
        }
      }
    });
  }, [messages, activeSessionId]);

  // Update side panel content if it's a chunked message that just finished loading
  useEffect(() => {
    if (sidePanelContent?.msgId && chunkedContent[sidePanelContent.msgId]) {
      setSidePanelContent(prev => ({
        ...prev,
        content: chunkedContent[sidePanelContent.msgId!]
      }));
    }
  }, [chunkedContent, sidePanelContent?.msgId]);

  // Sync shared policies from organization
  useEffect(() => {
    if (!organization?.id) return;

    const orgRef = doc(db, 'organizations', organization.id);
    const unsubscribe = onSnapshot(orgRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.policies) {
          setPolicies(data.policies);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}`);
    });

    return () => unsubscribe();
  }, [organization?.id]);

  // Real-time sessions sync (scoped by user or org)
  useEffect(() => {
    if (!user) return;

    let q;
    if (organization?.id) {
      q = query(
        collection(db, 'sessions'),
        where('orgId', '==', organization.id),
        orderBy('lastUpdatedAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'sessions'),
        where('userId', '==', user.uid),
        orderBy('lastUpdatedAt', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(sessionList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    });

    return () => unsubscribe();
  }, [user, organization?.id]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'sessions', activeSessionId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `sessions/${activeSessionId}/messages`));

    return () => unsubscribe();
  }, [activeSessionId]);

  // Real-time audit logs sync (scoped by user or org)
  useEffect(() => {
    if (!user) return;

    let q;
    if (organization?.id) {
      q = query(
        collection(db, 'audit_logs'),
        where('orgId', '==', organization.id),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        collection(db, 'audit_logs'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    });

    return () => unsubscribe();
  }, [user, organization?.id]);

  const togglePolicy = async (id: string) => {
    const newPolicies = policies.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p);
    setPolicies(newPolicies);

    if (organization?.id) {
      try {
        await updateDoc(doc(db, 'organizations', organization.id), {
          policies: newPolicies
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}`);
      }
    }
  };

  const createNewSession = async () => {
    if (!user) return;

    // Plan Limits Check
    if (subscription?.plan === 'free' && sessions.length >= 5) {
      setShowLimitModal(true);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'sessions'), {
        userId: user.uid,
        orgId: organization?.id || null,
        title: 'New Protected Chat',
        targetModel,
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      });
      setActiveSessionId(docRef.id);
      setActiveTab('playground');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sessions');
    }
  };

  const handleCreateOrg = async () => {
    if (!user || !orgName.trim()) return;
    setIsCreatingOrg(true);
    try {
      const orgRef = await addDoc(collection(db, 'organizations'), {
        name: orgName.trim(),
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        policies: DEFAULT_POLICIES
      });
      
      await updateDoc(doc(db, 'users', user.uid), {
        orgId: orgRef.id,
        role: 'admin'
      });
      
      // Refresh page to reload AuthContext
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'organizations');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;
    if (subscription?.plan === 'free') return;

    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}`);
    }
  };

  const renameSession = async (sessionId: string) => {
    if (!user || !newTitle.trim()) return;
    if (subscription?.plan === 'free') return;

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        title: newTitle.trim()
      });
      setIsRenaming(null);
      setNewTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sessions/${sessionId}`);
    }
  };

  const handleEvaluate = async () => {
    if (!inputPrompt.trim() || !user) return;
    
    setIsEvaluating(true);
    setIsForwarding(false);
    setEvaluationResult(null);
    setTargetResponse(null);

    const sentinel = new SentinelLogic(process.env.API_KEY || process.env.GEMINI_API_KEY || '');
    
    try {
      // Step 1: Sentinel Evaluation
      const result = await sentinel.evaluate(inputPrompt, policies);
      setEvaluationResult(result);
      
      // Save Audit Log
      try {
        await addDoc(collection(db, 'audit_logs'), {
          userId: user.uid,
          orgId: organization?.id || null,
          prompt: inputPrompt,
          result: {
            passed: result.passed,
            score: result.score,
            reasoning: result.reasoning,
            violations: result.violations,
            metrics: result.metrics
          },
          targetModel,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'audit_logs');
      }

      let currentSessionId = activeSessionId;
      if (!currentSessionId) {
        try {
          const sessionRef = await addDoc(collection(db, 'sessions'), {
            userId: user.uid,
            orgId: organization?.id || null,
            title: inputPrompt.substring(0, 30) + (inputPrompt.length > 30 ? '...' : ''),
            targetModel,
            createdAt: serverTimestamp(),
            lastUpdatedAt: serverTimestamp()
          });
          currentSessionId = sessionRef.id;
          setActiveSessionId(currentSessionId);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'sessions');
        }
      } else {
        // Auto-rename if it's the first prompt and title is default
        const currentSession = sessions.find(s => s.id === currentSessionId);
        if (currentSession && currentSession.title === 'New Protected Chat') {
          try {
            await updateDoc(doc(db, 'sessions', currentSessionId), {
              title: inputPrompt.substring(0, 30) + (inputPrompt.length > 30 ? '...' : '')
            });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `sessions/${currentSessionId}`);
          }
        }
      }

      if (currentSessionId) {
        try {
          // Check size (approximate by string length)
          const contentToSave = inputPrompt.length > 800000 
            ? inputPrompt.substring(0, 800000) + "\n\n[...Prompt truncated due to Firestore size limits...]" 
            : inputPrompt;

          await addDoc(collection(db, 'sessions', currentSessionId, 'messages'), {
            sessionId: currentSessionId,
            role: 'user',
            content: contentToSave,
            sentinelResult: result,
            createdAt: serverTimestamp()
          });

          await updateDoc(doc(db, 'sessions', currentSessionId), {
            lastUpdatedAt: serverTimestamp()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `sessions/${currentSessionId}/messages`);
        }
      }

      // Step 2: If passed, forward to target model
      if (result.passed && currentSessionId) {
        setIsForwarding(true);
        const currentModel = ALL_MODELS.find(m => m.id === targetModel);
        const response = await sentinel.forward(result.modifiedPrompt || inputPrompt, targetModel, currentModel?.utility);
        setTargetResponse(response);

        // Save Assistant Message
        try {
          const isSpecialModel = targetModel.toLowerCase().includes('sora') || targetModel.toLowerCase().includes('kling');
          const CHUNK_SIZE = 700000; // ~700KB to be safe with overhead
          
          if (isSpecialModel && response.content.length > CHUNK_SIZE) {
            const chunks = [];
            for (let i = 0; i < response.content.length; i += CHUNK_SIZE) {
              chunks.push(response.content.substring(i, i + CHUNK_SIZE));
            }

            const messageRef = await addDoc(collection(db, 'sessions', currentSessionId, 'messages'), {
              sessionId: currentSessionId,
              role: 'assistant',
              content: "", // Content will be loaded from chunks
              type: response.type,
              isChunked: true,
              chunkCount: chunks.length,
              metadata: response.metadata || null,
              createdAt: serverTimestamp()
            });

            // Save chunks
            for (let i = 0; i < chunks.length; i++) {
              await addDoc(collection(db, 'sessions', currentSessionId, 'messages', messageRef.id, 'chunks'), {
                index: i,
                data: chunks[i]
              });
            }
            
            // Update local state immediately so it shows up
            setChunkedContent(prev => ({ ...prev, [messageRef.id]: response.content }));
          } else {
            let contentToSave = response.content;
            let isTruncated = false;

            // For non-special models, we truncate early to avoid overhead
            if (!isSpecialModel && response.content.length > 800000) {
              isTruncated = true;
              if (response.type === 'image' || response.type === 'video') {
                contentToSave = `${response.type === 'image' ? 'Image' : 'Video'} is too large to be persisted in session history (Firestore 1MB limit). The full asset is still available in the current session view.`;
              } else {
                contentToSave = response.content.substring(0, 800000) + "\n\n[...Content truncated due to Firestore size limits...]";
              }
            }

            try {
              await addDoc(collection(db, 'sessions', currentSessionId, 'messages'), {
                sessionId: currentSessionId,
                role: 'assistant',
                content: contentToSave,
                type: response.type,
                isTruncated,
                metadata: response.metadata || null,
                createdAt: serverTimestamp()
              });
            } catch (innerError: any) {
              // If it still failed due to size, we truncate as a last resort
              if (innerError?.message?.includes('too large') || innerError?.code === 'invalid-argument') {
                await addDoc(collection(db, 'sessions', currentSessionId, 'messages'), {
                  sessionId: currentSessionId,
                  role: 'assistant',
                  content: `[System: Full ${response.type} data exceeded 1MB and could not be saved to history, but is available for download in this session.]`,
                  type: response.type,
                  isTruncated: true,
                  metadata: response.metadata || null,
                  createdAt: serverTimestamp()
                });
              } else {
                throw innerError;
              }
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `sessions/${currentSessionId}/messages`);
        }

        if (response.type === 'code' || response.type === 'image') {
          setSidePanelContent(response);
          setSidePanelTab(response.type === 'code' ? 'preview' : 'preview');
          setShowSidePanel(true);
        }
      }
      
      setInputPrompt('');
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsEvaluating(false);
      setIsForwarding(false);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E4E7] font-sans selection:bg-white selection:text-black flex relative overflow-hidden">
      <div className="noise" />
      
      {/* Sidebar */}
      <div className="w-72 border-r border-white/5 bg-[#050505] flex flex-col h-screen sticky top-0 z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black shadow-lg shadow-white/10">
            <Shield size={16} />
          </div>
          <span className="font-display font-bold text-lg tracking-tighter uppercase">SENTINELCORE</span>
        </div>

        <nav className="px-4 py-2 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-[#1F1F23] text-white' : 'text-[#A1A1AA] hover:bg-[#16161A] hover:text-white'}`}
          >
            <Activity size={18} />
            <span className="text-sm font-medium">Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('policies')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'policies' ? 'bg-[#1F1F23] text-white' : 'text-[#A1A1AA] hover:bg-[#16161A] hover:text-white'}`}
          >
            <Lock size={18} />
            <span className="text-sm font-medium">Logic Gates</span>
          </button>
          {subscription?.plan === 'enterprise' && (
            <button 
              onClick={() => setActiveTab('audit')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'audit' ? 'bg-[#1F1F23] text-white' : 'text-[#A1A1AA] hover:bg-[#16161A] hover:text-white'}`}
            >
              <Layers size={18} />
              <span className="text-sm font-medium">Audit Logs</span>
            </button>
          )}
          <button 
            onClick={() => {
              setActiveTab('playground');
              if (!activeSessionId) createNewSession();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'playground' ? 'bg-[#1F1F23] text-white' : 'text-[#A1A1AA] hover:bg-[#16161A] hover:text-white'}`}
          >
            <MessageSquare size={18} />
            <span className="text-sm font-medium">Playground</span>
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'billing' ? 'bg-[#1F1F23] text-white' : 'text-[#A1A1AA] hover:bg-[#16161A] hover:text-white'}`}
          >
            <CreditCard size={18} />
            <span className="text-sm font-medium">Billing</span>
          </button>
          <button 
            onClick={() => setActiveTab('organization')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${activeTab === 'organization' ? 'bg-[#1F1F23] text-white' : 'text-[#A1A1AA] hover:bg-[#16161A] hover:text-white'}`}
          >
            <Users size={18} />
            <span className="text-sm font-medium">Organization</span>
          </button>
        </nav>

        <div className="mt-6 px-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#52525B]">History</span>
            <button onClick={createNewSession} className="p-1 hover:bg-[#1F1F23] rounded text-[#A1A1AA] hover:text-white transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {sessions.map((session) => (
              <div key={session.id} className="group relative">
                {isRenaming === session.id ? (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && renameSession(session.id)}
                      onBlur={() => setIsRenaming(null)}
                      className="bg-[#1F1F23] text-white text-xs px-2 py-1 rounded border border-blue-500/50 outline-none w-full"
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setActiveSessionId(session.id);
                      setActiveTab('playground');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2 pr-12 ${activeSessionId === session.id ? 'bg-[#1F1F23] text-white border border-[#2D2D33]' : 'text-[#71717A] hover:bg-[#16161A] hover:text-white'}`}
                  >
                    <Clock size={12} />
                    <span className="truncate">{session.title}</span>
                  </button>
                )}
                
                {subscription?.plan !== 'free' && isRenaming !== session.id && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(session.id);
                        setNewTitle(session.title);
                      }}
                      className="p-1 hover:bg-[#2D2D33] rounded text-[#71717A] hover:text-white transition-colors"
                    >
                      <Settings size={10} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1 hover:bg-[#2D2D33] rounded text-[#71717A] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-[#1F1F23]">
          <div className="flex items-center justify-between bg-[#16161A] rounded-xl p-3 border border-[#1F1F23]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <UserIcon size={16} />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold truncate">{user?.displayName || 'User'}</div>
                <div className="text-[10px] text-[#52525B] truncate">{user?.email}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-[#52525B] hover:text-red-500 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#050505]/50 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#52525B]">
              <span>Infrastructure</span>
              <ChevronRight size={12} />
              <span className="text-white">{activeTab}</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-green-500/80">Production Core Active</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[8px] font-black text-white">P</div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">SentinelCore Pro</span>
            </div>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-xs tracking-tighter uppercase text-white/80">SENTINELCORE</span>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            </div>
            <button className="p-2 text-[#A1A1AA] hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.04] transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Zap size={80} />
                      </div>
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/5 text-white rounded-2xl group-hover:scale-110 transition-transform">
                          <Zap size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-[0.2em] bg-green-500/10 px-3 py-1 rounded-full">+12.5%</span>
                      </div>
                      <div className="text-6xl font-display font-bold tracking-tighter leading-none">{sessions.length}</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mt-4">Active Sessions</div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.04] transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Shield size={80} />
                      </div>
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/5 text-white rounded-2xl group-hover:scale-110 transition-transform">
                          <Shield size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-purple-500 uppercase tracking-[0.2em] bg-purple-500/10 px-3 py-1 rounded-full">99.9%</span>
                      </div>
                      <div className="text-6xl font-display font-bold tracking-tighter leading-none">4.2k</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mt-4">Threats Neutralized</div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.04] transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Cpu size={80} />
                      </div>
                      <div className="flex items-center justify-between mb-8">
                        <div className="p-4 bg-white/5 text-white rounded-2xl group-hover:scale-110 transition-transform">
                          <Cpu size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-full">14ms</span>
                      </div>
                      <div className="text-6xl font-display font-bold tracking-tighter leading-none">Global</div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mt-4">Network Latency</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] overflow-hidden">
                      <div className="p-10 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-display font-bold uppercase tracking-tight">Recent Sessions</h3>
                        <button className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">View All</button>
                      </div>
                      <div className="divide-y divide-white/5">
                        {sessions.length > 0 ? sessions.map((session, i) => (
                          <div key={i} className="p-8 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                            <div className="flex items-center gap-6">
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                              <div>
                                <div className="text-sm font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform">{session.title}</div>
                                <div className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">{session.targetModel}</div>
                              </div>
                            </div>
                            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                              {session.lastUpdatedAt instanceof Timestamp ? session.lastUpdatedAt.toDate().toLocaleTimeString() : ''}
                            </div>
                          </div>
                        )) : (
                          <div className="p-20 text-center text-white/20 text-xs font-bold uppercase tracking-[0.2em]">
                            No recent activity recorded.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10">
                      <h3 className="text-xl font-display font-bold uppercase tracking-tight mb-10">Integration Status</h3>
                      <div className="space-y-6">
                        {[
                          { name: 'ChatGPT (OpenAI)', status: 'Connected', icon: <Globe size={18} /> },
                          { name: 'Claude (Anthropic)', status: 'Connected', icon: <Layers size={18} /> },
                          { name: 'DeepSeek', status: 'Standby', icon: <Cpu size={18} /> },
                          { name: 'Gemini (Google)', status: 'Native', icon: <Shield size={18} /> },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-6 bg-white/[0.02] rounded-3xl border border-white/5 hover:bg-white/[0.04] transition-all group">
                            <div className="flex items-center gap-6">
                              <div className="text-white/40 group-hover:text-white transition-colors">{item.icon}</div>
                              <span className="text-xs font-bold uppercase tracking-widest">{item.name}</span>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
                              item.status === 'Connected' || item.status === 'Native' 
                              ? 'border-green-500/20 text-green-500 bg-green-500/5' 
                              : 'border-orange-500/20 text-orange-500 bg-orange-500/5'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'policies' && (
                <motion.div 
                  key="policies"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h2 className="text-5xl font-display font-bold tracking-tighter uppercase">Logic Gates</h2>
                      <p className="text-sm text-[#71717A] mt-2">Configure the safety layers that intercept every request.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {policies.map((policy) => (
                      <div key={policy.id} className={`group bg-white/[0.02] border ${policy.enabled ? 'border-white/5' : 'border-red-900/10 opacity-40'} rounded-3xl p-8 transition-all hover:bg-white/[0.04]`}>
                        <div className="flex items-start justify-between">
                          <div className="flex gap-6">
                            <div className={`p-4 rounded-2xl transition-all ${policy.enabled ? 'bg-white/5 text-white group-hover:scale-110' : 'bg-white/5 text-[#52525B]'}`}>
                              <Shield size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-4">
                                <h3 className="text-xl font-display font-bold tracking-tight uppercase">{policy.name}</h3>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full tracking-widest border ${
                                  policy.severity === 'critical' ? 'border-red-500/20 text-red-500 bg-red-500/5' :
                                  policy.severity === 'high' ? 'border-orange-500/20 text-orange-500 bg-orange-500/5' :
                                  'border-blue-500/20 text-blue-500 bg-blue-500/5'
                                }`}>
                                  {policy.severity}
                                </span>
                              </div>
                              <p className="text-sm text-[#71717A] mt-2 max-w-2xl">{policy.description}</p>
                              <div className="mt-6 p-4 bg-black/40 rounded-2xl border border-white/5">
                                <div className="text-[9px] font-bold text-[#52525B] uppercase tracking-[0.2em] mb-2">Instruction Logic</div>
                                <code className="text-xs text-[#A1A1AA] font-mono leading-relaxed">{policy.instruction}</code>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-[#52525B]">{policy.enabled ? 'Active' : 'Disabled'}</span>
                              <button 
                                onClick={() => togglePolicy(policy.id)}
                                className={`w-12 h-6 rounded-full relative transition-all ${policy.enabled ? 'bg-white' : 'bg-white/10'}`}
                              >
                                <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${policy.enabled ? 'left-7 bg-black' : 'left-1 bg-white/40'}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'playground' && (
                <motion.div 
                  key="playground"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col h-[calc(100vh-12rem)]"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-6">
                      <h2 className="text-3xl font-display font-bold tracking-tighter uppercase">Playground</h2>
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Secure Session</span>
                      </div>
                    </div>
                    <select 
                      value={targetModel}
                      onChange={(e) => setTargetModel(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-white/20 transition-all cursor-pointer"
                    >
                      {availableModels.map(model => (
                        <option key={model.id} value={model.id} className="bg-[#050505]">{model.id}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl relative">
                    <div className="flex-1 overflow-y-auto p-10 space-y-10">
                      {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center relative">
                          {/* Floating Badges */}
                          <motion.div 
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute left-[10%] top-[20%] p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-xl"
                          >
                            <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-500">
                              <Zap size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">Sonnet 4.5</span>
                          </motion.div>

                          <motion.div 
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute right-[10%] top-[35%] p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-xl"
                          >
                            <div className="w-6 h-6 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-500">
                              <Cpu size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">GLM 5</span>
                          </motion.div>

                          <motion.div 
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute left-[25%] bottom-[20%] p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-xl"
                          >
                            <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-500">
                              <Shield size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest">GPT-5.4</span>
                          </motion.div>

                          <div className="space-y-8 max-w-2xl px-8">
                            <div className="space-y-4">
                              <div className="flex items-center justify-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-black shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                                  <Shield size={24} />
                                </div>
                                <h1 className="text-6xl font-display font-bold tracking-tighter uppercase">TheCoreGround</h1>
                              </div>
                              <p className="text-lg text-white/40 font-medium tracking-tight">What are you creating today?</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                { icon: <Globe size={14} />, label: 'Website', prompt: 'Create a modern, high-converting landing page for a SaaS product with a dark theme, glassmorphism, and smooth scroll animations.' },
                                { icon: <Play size={14} />, label: 'Game Dev', prompt: 'Create a simple but addictive 2D browser game using Canvas and JavaScript. Something like a neon-themed space shooter.' },
                                { icon: <Layers size={14} />, label: '3D Design', prompt: 'Create a 3D product showcase page using Three.js or simple CSS 3D transforms.' },
                                { icon: <Activity size={14} />, label: 'Data Viz', prompt: 'Create an interactive compound interest calculator with a beautiful line chart using Chart.js and sliders for input.' },
                                { icon: <Code size={14} />, label: 'UI Component', prompt: 'Create a professional, accessible dashboard sidebar with nested navigation and hover effects.' },
                                { icon: <Maximize2 size={14} />, label: 'Image', prompt: 'A cinematic, hyper-realistic portrait of a cybernetic explorer in a neon-lit jungle, 8k resolution, dramatic lighting.' },
                                { icon: <Zap size={14} />, label: 'Logo', prompt: 'Design a minimalist, geometric logo for a tech startup called "Sentinel" using SVG code.' },
                                { icon: <MessageSquare size={14} />, label: 'Mobile App', prompt: 'Create a mobile-first UI for a fitness tracking app with progress rings and activity logs.' }
                              ].map((chip, i) => (
                                <button 
                                  key={i}
                                  onClick={() => setInputPrompt(chip.prompt)}
                                  className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all group text-left"
                                >
                                  <div className="text-white/30 group-hover:text-white transition-colors">
                                    {chip.icon}
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">{chip.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {messages.map((msg, i) => (
                        <motion.div 
                          key={msg.id || i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[75%] space-y-4`}>
                            <div className={`p-6 rounded-3xl text-sm leading-relaxed ${
                              msg.role === 'user' 
                              ? 'bg-white text-black font-medium' 
                              : 'bg-white/5 border border-white/5 text-[#E4E4E7]'
                            }`}>
                              {msg.type === 'image' ? (
                                <div className="space-y-4">
                                  {(chunkedContent[msg.id] || msg.content) && (
                                    <img src={chunkedContent[msg.id] || msg.content} alt="Generated" className="rounded-2xl w-full h-auto shadow-2xl" />
                                  )}
                                  <button 
                                    onClick={() => {
                                      setSidePanelContent({ 
                                        type: 'image', 
                                        content: chunkedContent[msg.id] || msg.content,
                                        msgId: msg.id
                                      });
                                      setSidePanelTab('preview');
                                      setShowSidePanel(true);
                                    }}
                                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
                                  >
                                    <Maximize2 size={12} />
                                    Expand Image
                                  </button>
                                </div>
                              ) : msg.type === 'video' ? (
                                <div className="space-y-4">
                                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black/40 group">
                                    {(chunkedContent[msg.id] || msg.content) && (
                                      <img src={chunkedContent[msg.id] || msg.content} alt="Video Preview" className="w-full h-full object-cover opacity-60" />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <button 
                                        onClick={() => {
                                          setSidePanelContent({ 
                                            type: 'video', 
                                            content: chunkedContent[msg.id] || msg.content,
                                            metadata: msg.metadata,
                                            msgId: msg.id
                                          });
                                          setShowSidePanel(true);
                                        }}
                                        className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 hover:scale-110 transition-transform"
                                      >
                                        <Play size={20} className="text-white fill-white ml-1" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">AI Video Stream</span>
                                    {msg.isChunked && !chunkedContent[msg.id] && (
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-blue-400 animate-pulse">Assembling Chunks...</span>
                                    )}
                                  </div>
                                </div>
                              ) : msg.type === 'code' ? (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3 text-blue-400 mb-2">
                                    <Code size={16} />
                                    <span className="font-bold uppercase tracking-widest text-[10px]">Application Generated</span>
                                  </div>
                                  <div className="markdown-body opacity-80">
                                    <Markdown>{chunkedContent[msg.id] || msg.content}</Markdown>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      setSidePanelContent({ 
                                        type: 'code', 
                                        content: chunkedContent[msg.id] || msg.content,
                                        msgId: msg.id
                                      });
                                      setSidePanelTab('preview');
                                      setShowSidePanel(true);
                                    }}
                                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <Play size={12} />
                                    Launch Preview
                                  </button>
                                </div>
                              ) : msg.type === 'biorender' ? (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                                      <Layers size={20} />
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold uppercase tracking-wider text-blue-400">BioRender Connector</div>
                                      <div className="text-[10px] text-white/40 uppercase tracking-widest">Scientific Diagrams & Icons</div>
                                    </div>
                                  </div>
                                  <div className="text-sm leading-relaxed text-white/80">
                                    <Markdown>{msg.content}</Markdown>
                                  </div>
                                  {msg.metadata?.resources && msg.metadata.resources.length > 0 && (
                                    <div className="grid grid-cols-1 gap-2 mt-4">
                                      {msg.metadata.resources.map((res: any, idx: number) => (
                                        <a 
                                          key={idx}
                                          href={res.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group"
                                        >
                                          <div className="flex items-center gap-3 overflow-hidden">
                                            <ExternalLink size={14} className="text-white/40 group-hover:text-blue-400 transition-colors shrink-0" />
                                            <span className="text-xs font-medium truncate">{res.title}</span>
                                          </div>
                                          <ChevronRight size={14} className="text-white/20 group-hover:text-white transition-colors" />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="markdown-body">
                                  <Markdown>{chunkedContent[msg.id] || msg.content}</Markdown>
                                </div>
                              )}
                            </div>
                            
                            {msg.sentinelResult && (
                              <div className="space-y-3">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[9px] font-bold uppercase tracking-widest ${
                                  msg.sentinelResult.passed 
                                  ? 'bg-green-500/5 border-green-500/10 text-green-500' 
                                  : 'bg-red-500/5 border-red-500/10 text-red-400'
                                }`}>
                                  {msg.sentinelResult.passed ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                  Sentinel: {msg.sentinelResult.passed ? `PASSED (${(msg.sentinelResult.score * 100).toFixed(0)}%)` : 'BLOCKED'}
                                </div>
                                {!msg.sentinelResult.passed && (
                                  <div className="p-5 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-xs text-red-400/80 font-serif italic leading-relaxed">
                                    <div className="font-bold uppercase tracking-widest text-[9px] mb-2 opacity-40">Rejection Reasoning</div>
                                    {msg.sentinelResult.reasoning}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}

                      {isEvaluating && (
                        <div className="flex justify-start">
                          <div className="bg-[#16161A] border border-[#1F1F23] p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Sentinel Intercepting...</span>
                          </div>
                        </div>
                      )}

                      {isForwarding && (
                        <div className="flex justify-start">
                          <div className="bg-[#16161A] border border-[#1F1F23] p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                            <div className="w-3 h-3 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                            <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">Retrieving from {targetModel}...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="p-6 bg-[#0D0D10] border-t border-[#1F1F23]">
                      <div className="flex items-center gap-3 mb-4">
                        <button 
                          onClick={() => handleQuickPrompt('chat')}
                          className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                          <MessageSquare size={12} />
                          Chat
                        </button>
                        <button 
                          onClick={() => handleQuickPrompt('slideshow')}
                          className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                          <Presentation size={12} />
                          Slideshow
                        </button>
                        <button 
                          onClick={() => handleQuickPrompt('biorender')}
                          className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                        >
                          <Layers size={12} />
                          BioRender
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <textarea 
                          value={inputPrompt}
                          onChange={(e) => setInputPrompt(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleEvaluate();
                            }
                          }}
                          placeholder="Type a message..."
                          className="w-full bg-[#16161A] border border-[#1F1F23] rounded-2xl px-6 py-4 pr-16 text-sm focus:outline-none focus:border-blue-500 transition-all resize-none h-14"
                        />
                        <button 
                          onClick={handleEvaluate}
                          disabled={isEvaluating || isForwarding || !inputPrompt.trim()}
                          className={`absolute right-3 p-2.5 rounded-xl transition-all ${
                            isEvaluating || isForwarding || !inputPrompt.trim()
                            ? 'text-[#52525B]'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                          }`}
                        >
                          <Send size={18} />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-[#52525B] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5">
                          <Lock size={10} />
                          End-to-End Safety
                        </div>
                        <div className="w-1 h-1 bg-[#1F1F23] rounded-full" />
                        <div className="flex items-center gap-1.5">
                          <Shield size={10} />
                          Gatekeeping Active
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'audit' && subscription?.plan === 'enterprise' && (
                <motion.div
                  key="audit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="space-y-2">
                      <h2 className="text-5xl font-display font-bold tracking-tighter uppercase">Audit Logs</h2>
                      <p className="text-sm text-white/30 font-medium uppercase tracking-widest">Real-time safety metrics and evaluation history.</p>
                    </div>
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            <th className="p-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Timestamp</th>
                            <th className="p-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Status</th>
                            <th className="p-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Model</th>
                            <th className="p-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Latency</th>
                            <th className="p-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Tokens</th>
                            <th className="p-8 text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Reasoning</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="p-8 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                {log.createdAt instanceof Timestamp ? log.createdAt.toDate().toLocaleString() : 'Just now'}
                              </td>
                              <td className="p-8">
                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] border ${
                                  log.result.passed 
                                  ? 'border-green-500/20 text-green-500 bg-green-500/5' 
                                  : 'border-red-500/20 text-red-500 bg-red-500/5'
                                }`}>
                                  {log.result.passed ? 'Passed' : 'Blocked'}
                                </span>
                              </td>
                              <td className="p-8 text-xs font-bold uppercase tracking-widest text-white/60">{log.targetModel}</td>
                              <td className="p-8 text-[10px] font-bold text-white/40 uppercase tracking-widest">{log.result.metrics?.latencyMs || 0}ms</td>
                              <td className="p-8 text-[10px] font-bold text-white/40 uppercase tracking-widest">{log.result.metrics?.tokensEstimated || 0}</td>
                              <td className="p-8 text-xs text-white/30 max-w-xs truncate font-serif italic group-hover:text-white/60 transition-colors">
                                {log.result.reasoning}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'billing' && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Pricing />
                </motion.div>
              )}

              {activeTab === 'organization' && (
                <motion.div
                  key="organization"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-4xl font-display font-bold tracking-tight">Organization</h2>
                      <p className="text-white/40 text-sm mt-2">Manage your team and shared security protocols.</p>
                    </div>
                  </div>

                  {!organization ? (
                    <div className="max-w-md mx-auto bg-white/5 border border-white/5 rounded-3xl p-12 text-center space-y-8">
                      <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto text-white/40">
                        <Users size={40} />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-display font-bold">Create an Organization</h3>
                        <p className="text-white/40 text-sm">Collaborate with your team in real-time on policies and audit logs.</p>
                      </div>
                      <div className="space-y-4">
                        <input 
                          type="text"
                          placeholder="Organization Name"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-white/20 transition-all"
                        />
                        <button 
                          onClick={handleCreateOrg}
                          disabled={isCreatingOrg || !orgName.trim()}
                          className="w-full bg-white text-black h-14 rounded-2xl font-bold hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isCreatingOrg ? (
                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                          ) : (
                            <>
                              <Plus size={18} />
                              <span>Create Organization</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xl font-display font-bold uppercase tracking-tight">Org Details</h3>
                            <div className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-500/20">Active</div>
                          </div>
                          <div className="grid grid-cols-2 gap-8">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Name</div>
                              <div className="text-lg font-medium">{organization.name}</div>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Org ID</div>
                              <div className="text-lg font-medium font-mono text-white/50">{organization.id}</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/5 border border-white/5 rounded-3xl p-8 space-y-6">
                          <h3 className="text-xl font-display font-bold uppercase tracking-tight">Team Members</h3>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white/40">
                                  <UserIcon size={20} />
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{user?.displayName || 'You'}</div>
                                  <div className="text-[10px] text-white/30 uppercase tracking-widest">{user?.email}</div>
                                </div>
                              </div>
                              <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/40">Admin</div>
                            </div>
                            <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center space-y-4">
                              <p className="text-sm text-white/30">Invite more team members to collaborate.</p>
                              <button className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">Invite Member</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="bg-blue-600/10 border border-blue-600/20 rounded-3xl p-8 space-y-4">
                          <div className="p-3 bg-blue-600/20 rounded-2xl w-fit text-blue-400">
                            <Zap size={24} />
                          </div>
                          <h3 className="text-xl font-display font-bold">Real-time Sync</h3>
                          <p className="text-sm text-white/50 leading-relaxed">
                            All changes to policies, audit logs, and shared sessions are synchronized instantly across your entire team.
                          </p>
                        </div>

                        <div className="bg-purple-600/10 border border-purple-600/20 rounded-3xl p-8 space-y-4">
                          <div className="p-3 bg-purple-600/20 rounded-2xl w-fit text-purple-400">
                            <Shield size={24} />
                          </div>
                          <h3 className="text-xl font-display font-bold">Shared Governance</h3>
                          <p className="text-sm text-white/50 leading-relaxed">
                            Admins can configure global logic gates that apply to all organization members.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Side Panel for Previews */}
        <AnimatePresence>
          {showSidePanel && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ width: sidePanelWidth }}
              className="fixed top-0 right-0 h-full bg-[#050505] border-l border-white/10 z-[100] shadow-2xl flex flex-col"
            >
              {/* Resize Handle */}
              <div 
                onMouseDown={() => setIsResizing(true)}
                className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-white/20 transition-colors z-[110]"
              />

              <div className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-[#0D0D10]">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-lg text-white/40">
                      {sidePanelContent?.type === 'image' ? <Maximize2 size={20} /> : <Code size={20} />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest">
                        {sidePanelContent?.type === 'image' ? 'Image Preview' : 'Application Preview'}
                      </h3>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Sentinel Logic Gate Verified</p>
                    </div>
                  </div>

                  {sidePanelContent?.type === 'code' && (
                    <div className="flex items-center bg-white/5 p-1 rounded-xl">
                      <button 
                        onClick={() => setSidePanelTab('preview')}
                        className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${sidePanelTab === 'preview' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                      >
                        Preview
                      </button>
                      <button 
                        onClick={() => setSidePanelTab('code')}
                        className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${sidePanelTab === 'code' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                      >
                        Code
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <button 
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      className={`p-3 rounded-full transition-all ${showDownloadMenu ? 'bg-white text-black' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}
                    >
                      <MoreVertical size={24} />
                    </button>
                    
                    <AnimatePresence>
                      {showDownloadMenu && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 top-full mt-4 w-64 bg-[#16161A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[120]"
                        >
                          <div className="p-4 border-b border-white/5">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Export Artifact</h4>
                          </div>
                          <div className="p-2">
                            {sidePanelContent?.type === 'code' ? (
                              <>
                                <button 
                                  onClick={() => downloadFile(sidePanelContent.content, 'artifact.html', 'text/html')}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-all text-left"
                                >
                                  <FileCode size={18} className="text-blue-400" />
                                  <div>
                                    <div className="text-xs font-bold uppercase tracking-wider">Download MVP</div>
                                    <div className="text-[9px] text-white/30 uppercase tracking-widest">Single HTML File</div>
                                  </div>
                                </button>
                                <button 
                                  onClick={() => downloadFile(sidePanelContent.content, 'presentation.ppt', 'application/vnd.ms-powerpoint')}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-all text-left"
                                >
                                  <Presentation size={18} className="text-orange-400" />
                                  <div>
                                    <div className="text-xs font-bold uppercase tracking-wider">Download PPT</div>
                                    <div className="text-[9px] text-white/30 uppercase tracking-widest">PowerPoint Format</div>
                                  </div>
                                </button>
                              </>
                            ) : sidePanelContent?.type === 'video' ? (
                              <button 
                                onClick={() => downloadImage(sidePanelContent.content, 'generated-video-frame.png')}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-all text-left"
                              >
                                <Play size={18} className="text-red-400" />
                                <div>
                                  <div className="text-xs font-bold uppercase tracking-wider">Download Keyframe</div>
                                  <div className="text-[9px] text-white/30 uppercase tracking-widest">High-Fidelity PNG Asset</div>
                                </div>
                              </button>
                            ) : sidePanelContent?.type === 'image' ? (
                              <button 
                                onClick={() => downloadImage(sidePanelContent.content, 'generated-image.png')}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-all text-left"
                              >
                                <FileImage size={18} className="text-purple-400" />
                                <div>
                                  <div className="text-xs font-bold uppercase tracking-wider">Download PNG</div>
                                  <div className="text-[9px] text-white/30 uppercase tracking-widest">High Quality Image</div>
                                </div>
                              </button>
                            ) : (
                              <div className="p-4 text-[10px] text-white/20 uppercase tracking-widest text-center">
                                No exportable content
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => setShowSidePanel(false)}
                    className="p-3 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden bg-noise relative">
                {sidePanelContent?.type === 'image' ? (
                  <div className="h-full flex items-center justify-center p-12 overflow-y-auto">
                    {sidePanelContent.content && (
                      <img src={sidePanelContent.content} alt="Preview" className="max-w-full max-h-full rounded-3xl shadow-[0_0_100px_rgba(255,255,255,0.05)]" />
                    )}
                  </div>
                ) : sidePanelContent?.type === 'video' ? (
                  <div className="h-full flex flex-col items-center justify-center p-12 overflow-y-auto">
                    <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(255,255,255,0.05)] bg-black group">
                      {sidePanelContent.content && (
                        <motion.img 
                          src={sidePanelContent.content} 
                          alt="Video Keyframe" 
                          animate={isVideoPlaying ? {
                            scale: [1, 1.1, 1.05],
                            x: [0, -20, 10],
                            y: [0, 10, -5]
                          } : { scale: 1, x: 0, y: 0 }}
                          transition={{
                            duration: 15,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut"
                          }}
                          className={`w-full h-full object-cover transition-opacity duration-700 ${isVideoPlaying ? 'opacity-100' : 'opacity-60'}`} 
                        />
                      )}
                      
                      {/* Video Overlay UI */}
                      <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-8 transition-all duration-500 ${isVideoPlaying ? 'bg-black/20' : 'bg-black/40'}`}>
                        <button 
                          onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                          className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 border border-white/20 hover:scale-110 transition-transform cursor-pointer group/play z-10"
                        >
                          {isVideoPlaying ? (
                            <div className="flex gap-1">
                              <div className="w-2 h-8 bg-white rounded-full" />
                              <div className="w-2 h-8 bg-white rounded-full" />
                            </div>
                          ) : (
                            <Play size={32} className="text-white fill-white ml-1" />
                          )}
                        </button>

                        <div className={`transition-all duration-500 transform ${isVideoPlaying ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                          <h4 className="text-2xl font-display font-bold tracking-tight mb-2">AI Video Preview</h4>
                          <p className="text-sm text-white/40 font-bold uppercase tracking-widest mb-8">Generated by {sidePanelContent.metadata?.modelName}</p>
                        </div>

                        {/* Bottom Status Bar */}
                        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest">{sidePanelContent.metadata?.duration}</div>
                            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest">{sidePanelContent.metadata?.resolution}</div>
                          </div>
                          {isVideoPlaying && (
                            <motion.div 
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="px-4 py-1.5 bg-blue-500/20 backdrop-blur-md rounded-lg border border-blue-500/30 text-[10px] font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              Cinematic Stream
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-12 max-w-2xl text-center">
                      <p className="text-sm text-white/40 leading-relaxed italic font-serif">"{sidePanelContent.metadata?.prompt}"</p>
                      <p className="mt-4 text-[10px] text-white/20 uppercase tracking-[0.2em]">Note: This is a high-fidelity cinematic motion preview. The full high-resolution asset is available for download.</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full">
                    {sidePanelTab === 'preview' ? (
                      <div className="h-full w-full bg-white flex flex-col">
                        <div className="h-8 bg-gray-100 border-b flex items-center px-4 gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                          <div className="ml-4 text-[10px] font-mono text-gray-400">localhost:3000</div>
                        </div>
                        <iframe 
                          key={sidePanelContent?.content}
                          className="flex-1 w-full border-none"
                          srcDoc={(() => {
                            const content = sidePanelContent?.content || "";
                            const codeMatch = content.match(/```(?:[a-zA-Z]+)?\n([\s\S]*?)```/);
                            const code = codeMatch ? codeMatch[1] : content;
                            
                            if (code.includes('<!DOCTYPE html>') || code.includes('<html')) {
                              return code;
                            }

                            return `
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <meta charset="UTF-8">
                                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                  <script src="https://cdn.tailwindcss.com"></script>
                                  <script src="https://unpkg.com/lucide@latest"></script>
                                  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                                  <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>
                                  <style>
                                    body { 
                                      margin: 0; 
                                      padding: 0; 
                                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                      background: white;
                                      min-height: 100vh;
                                    }
                                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                                  </style>
                                </head>
                                <body class="custom-scrollbar">
                                  <div id="root">
                                    ${code}
                                  </div>
                                  <script>
                                    try {
                                      if (window.lucide) {
                                        window.lucide.createIcons();
                                      }
                                    } catch (e) {
                                      console.error("Lucide icons failed to load:", e);
                                    }
                                  </script>
                                </body>
                              </html>
                            `;
                          })()}
                        />
                      </div>
                    ) : (
                      <div className="h-full overflow-y-auto p-12">
                        <div className="max-w-4xl mx-auto space-y-8">
                          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem]">
                            <div className="markdown-body">
                              <Markdown>{sidePanelContent?.content}</Markdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Modal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title="Limit Reached"
      >
        <p>You've reached the limit of 5 sessions for the Free plan.</p>
        <p className="mt-2">Upgrade to Pro to unlock unlimited sessions and advanced safety logic gates.</p>
        <button
          onClick={() => {
            setShowLimitModal(false);
            setActiveTab('billing');
          }}
          className="mt-6 w-full py-3 bg-blue-600 text-white font-mono text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
        >
          View Plans
        </button>
      </Modal>
    </div>
  );
};

export default SentinelDashboard;
