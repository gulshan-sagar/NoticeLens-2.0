import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeftRight, ArrowRight, BadgeCheck,
  BookOpen, CalendarDays, Check, CheckCircle2, ChevronRight, CircleHelp,
  ClipboardCheck, Clock3, FileCheck2, FileDiff, FileImage, FileSearch,
  FileSpreadsheet, FileText, GraduationCap, History, Languages, Library,
  LoaderCircle, Menu, MessageCircle, MessageSquareText, Mic, MicOff, Moon,
  PanelLeftClose, Plus, Search, Send, ShieldCheck, Sparkles, Sun, UploadCloud,
  Volume2, X, Zap,
} from 'lucide-react';

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.txt', '.md', '.csv', '.docx', '.xlsx', '.xls', '.pptx'];
const ACCEPT_STRING = ACCEPTED_EXTENSIONS.join(',');
const SAMPLE_NAME = 'DTU-Merit-cum-Means-Scholarship-Sample.txt';
const DEFAULT_MODEL = 'gemma-4-26b-a4b-it';

function getExtension(name = '') {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return 'Date not specified';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function getCountdown(value) {
  if (!value) return null;
  const target = new Date(`${value}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const difference = target.getTime() - Date.now();
  if (difference < 0) return { label: 'Date has passed', past: true };
  const days = Math.ceil(difference / 86400000);
  return { label: days === 1 ? '1 day left' : `${days} days left`, past: false };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function readHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem('noticelens-history') || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function displayErrorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.';
}

async function readApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function Evidence({ children }) {
  if (!children) return null;
  return <div className="evidence"><span>Source evidence</span><p>“{children}”</p></div>;
}

function SectionHeading({ icon: Icon, title, description, action }) {
  return (
    <div className="section-heading">
      <div className="section-heading-icon"><Icon size={17} /></div>
      <div className="section-heading-copy"><h3>{title}</h3>{description && <p>{description}</p>}</div>
      {action}
    </div>
  );
}

function EmptyPanel({ icon: Icon = FileSearch, title, description }) {
  return <div className="empty-panel"><span><Icon size={22} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function App() {
  const mainInputRef = useRef(null);
  const compareARef = useRef(null);
  const compareBRef = useRef(null);
  const chatEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const speechTranscriptRef = useRef('');
  const fileDragDepthRef = useRef(0);

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('noticelens-theme') || 'light'; } catch { return 'light'; }
  });
  const [activeView, setActiveView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [language, setLanguage] = useState('English');
  const [serverStatus, setServerStatus] = useState('checking');
  const [configured, setConfigured] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [comparePreferences, setComparePreferences] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [librarySearch, setLibrarySearch] = useState('');
  const [eligibilityDetails, setEligibilityDetails] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('noticelens-theme', theme); } catch { /* storage may be unavailable */ }
  }, [theme]);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then(readApiResponse)
      .then((data) => {
        if (!active) return;
        setServerStatus(data.ok ? 'online' : 'offline');
        setConfigured(Boolean(data.configured));
        setModel(data.model || DEFAULT_MODEL);
      })
      .catch(() => { if (active) setServerStatus('offline'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isAsking]);

  useEffect(() => () => {
    if (speechRecognitionRef.current) speechRecognitionRef.current.abort();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const actionSteps = useMemo(() => asArray(analysis?.actionSteps), [analysis]);
  const keyPoints = useMemo(() => asArray(analysis?.keyPoints), [analysis]);
  const eligibility = useMemo(() => asArray(analysis?.eligibility), [analysis]);
  const requiredDocuments = useMemo(() => asArray(analysis?.documentsRequired), [analysis]);
  const importantDates = useMemo(() => asArray(analysis?.importantDates), [analysis]);
  const completionPercent = actionSteps.length ? Math.round((completedTasks.length / actionSteps.length) * 100) : 0;
  const countdown = getCountdown(analysis?.deadline?.dateISO);
  const filteredHistory = history.filter((item) => `${item.title} ${item.fileName} ${item.category}`.toLowerCase().includes(librarySearch.toLowerCase()));

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  }

  function addToHistory(nextAnalysis, nextFile) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName: nextFile.name,
      title: nextAnalysis?.title || nextFile.name,
      category: nextAnalysis?.documentCategory || 'Document',
      summary: nextAnalysis?.summary || '',
      date: new Date().toISOString(),
    };
    setHistory((current) => {
      const next = [entry, ...current.filter((item) => item.fileName !== entry.fileName)].slice(0, 12);
      try { localStorage.setItem('noticelens-history', JSON.stringify(next)); } catch { /* history is optional */ }
      return next;
    });
  }

  function resetForFile(nextFile) {
    setFile(nextFile);
    setAnalysis(null);
    setCompletedTasks([]);
    setMessages([]);
    setError('');
    if (nextFile) setActiveView('analyse');
  }

  function validateFile(nextFile, isCompare = false) {
    if (!nextFile) return false;
    const extension = getExtension(nextFile.name);
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError('This format is not supported. Choose PDF, an image, TXT, MD, CSV, DOCX, XLS, XLSX or PPTX.');
      return false;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setError('This document is larger than 12 MB. Please choose a smaller file.');
      return false;
    }
    if (!isCompare) setError('');
    return true;
  }

  function handlePickedFile(nextFile) {
    if (validateFile(nextFile)) resetForFile(nextFile);
  }

  async function loadSample() {
    setError('');
    try {
      const response = await fetch('/sample-notice.txt');
      if (!response.ok) throw new Error('The demo document could not be loaded.');
      const text = await response.text();
      resetForFile(new File([text], SAMPLE_NAME, { type: 'text/plain' }));
      showToast('Sample document loaded. Analyse it when ready.');
    } catch (loadError) { setError(displayErrorMessage(loadError)); }
  }

  async function loadComparisonSample() {
    setError('');
    try {
      const [originalResponse, revisedResponse] = await Promise.all([
        fetch('/sample-compare-original.txt'),
        fetch('/sample-compare-revised.txt'),
      ]);
      if (!originalResponse.ok || !revisedResponse.ok) throw new Error('The sample comparison files could not be loaded.');
      const [originalText, revisedText] = await Promise.all([originalResponse.text(), revisedResponse.text()]);
      setCompareA(new File([originalText], 'Sample-Scholarship-Original.txt', { type: 'text/plain' }));
      setCompareB(new File([revisedText], 'Sample-Scholarship-Revised.txt', { type: 'text/plain' }));
      setComparePreferences('I am an undergraduate student with a CGPA of 7.2 and annual family income of INR 4,80,000. My priorities are meeting the eligibility criteria and having enough time to prepare the application. This is fictional demo profile information.');
      setCompareResult(null);
      showToast('Fictional sample comparison loaded.');
    } catch (sampleError) { setError(displayErrorMessage(sampleError)); }
  }

  async function analyseDocument() {
    if (!file || isAnalyzing) return;
    if (!configured) {
      setError('Gemma is not configured. Add your API key to server/.env and restart the backend.');
      return;
    }
    setIsAnalyzing(true);
    setError('');
    const body = new FormData();
    body.append('notice', file);
    body.append('language', language);
    try {
      const data = await readApiResponse(await fetch('/api/analyze', { method: 'POST', body }));
      setAnalysis(data.analysis || {});
      setModel(data.model || model);
      setMessages([{ role: 'assistant', content: `I’ve analysed ${data.analysis?.title || file.name}. Ask me what it means, what matters, or what to do next.` }]);
      addToHistory(data.analysis, file);
      setActiveView('analyse');
    } catch (requestError) { setError(displayErrorMessage(requestError)); }
    finally { setIsAnalyzing(false); }
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) {
      showToast('Spoken replies are not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text || '').replace(/[*#`_]/g, ''));
    utterance.lang = language === 'Hindi' ? 'hi-IN' : 'en-IN';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function askQuestion(nextQuestion = question, options = {}) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || !file || isAsking) return;
    setQuestion('');
    setMessages((current) => [...current, { role: 'user', content: trimmed }]);
    setIsAsking(true);
    setError('');
    const body = new FormData();
    body.append('notice', file);
    body.append('question', trimmed);
    body.append('language', language);
    body.append('history', JSON.stringify(messages.slice(-8).map(({ role, content }) => ({ role, content }))));
    try {
      const data = await readApiResponse(await fetch('/api/chat', { method: 'POST', body }));
      const answer = data.answer || 'I could not find a clear answer in this document.';
      setMessages((current) => [...current, {
        role: 'assistant',
        content: answer,
        evidenceQuotes: asArray(data.evidenceQuotes),
        confidence: data.confidence || 'low',
        notInDocument: Boolean(data.notInDocument ?? data.notInNotice),
      }]);
      if (options.speak) speakText(answer);
    } catch (requestError) {
      setMessages((current) => [...current, { role: 'assistant', content: displayErrorMessage(requestError), error: true }]);
    } finally { setIsAsking(false); }
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice input is not supported in this browser. Try Chrome or Edge, or type your question.');
      return;
    }
    if (!file) {
      showToast('Upload and analyse a document before asking voice questions.');
      setActiveView('analyse');
      return;
    }
    try {
      if (speechRecognitionRef.current) speechRecognitionRef.current.abort();
      const recognition = new SpeechRecognition();
      speechTranscriptRef.current = '';
      recognition.lang = language === 'Hindi' ? 'hi-IN' : 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
        speechTranscriptRef.current = transcript;
        setQuestion(transcript);
      };
      recognition.onerror = (event) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') showToast(`Microphone issue: ${event.error}. You can type instead.`);
      };
      recognition.onend = () => {
        setIsListening(false);
        const transcript = speechTranscriptRef.current.trim();
        if (transcript) askQuestion(transcript, { speak: true });
      };
      speechRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      showToast('Could not start the microphone. Check browser permissions.');
    }
  }

  function stopVoiceInput() {
    speechRecognitionRef.current?.stop();
  }

  function handleComparePickedFile(slot, nextFile) {
    if (!validateFile(nextFile, true)) return;
    if (slot === 'A') setCompareA(nextFile);
    else setCompareB(nextFile);
    setCompareResult(null);
    setError('');
  }

  async function compareDocuments() {
    if (!compareA || !compareB || isComparing) return;
    if (!configured) { setError('Add your Google AI Studio key to server/.env and restart the backend first.'); return; }
    setIsComparing(true);
    setError('');
    setCompareResult(null);
    const body = new FormData();
    body.append('noticeA', compareA);
    body.append('noticeB', compareB);
    body.append('profile', JSON.stringify({ preferences: comparePreferences.trim() }));
    body.append('language', language);
    try {
      const data = await readApiResponse(await fetch('/api/compare', { method: 'POST', body }));
      setCompareResult(data.comparison || {});
      setModel(data.model || model);
    } catch (requestError) { setError(displayErrorMessage(requestError)); }
    finally { setIsComparing(false); }
  }

  function runEligibilityCheck() {
    const details = eligibilityDetails.trim();
    if (!details) { showToast('Add the details you want checked against the document.'); return; }
    const eligibilityQuestion = `Assess my situation against the eligibility or qualification criteria in this document. My details: ${details}. For each criterion, label it Met, Not met, or Unknown. Cite the exact document wording, do not infer missing facts, and explain what I should verify.`;
    setActiveView('assistant');
    askQuestion(eligibilityQuestion);
  }

  function toggleTask(index) {
    setCompletedTasks((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
  }

  function navigate(view) {
    setActiveView(view);
    setError('');
    setMobileNavOpen(false);
  }

  function clearHistory() {
    setHistory([]);
    try { localStorage.removeItem('noticelens-history'); } catch { /* ignore */ }
    showToast('Recent activity cleared.');
  }

  const viewNames = {
    home: 'Home', analyse: 'Analyse documents', compare: 'Compare documents',
    assistant: 'AI Assistant', actions: 'Action centre', library: 'My library',
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: BookOpen },
    { id: 'analyse', label: 'Analyse documents', icon: FileSearch },
    { id: 'compare', label: 'Compare documents', icon: ArrowLeftRight },
    { id: 'assistant', label: 'AI assistant', icon: MessageSquareText },
    { id: 'actions', label: 'Action centre', icon: ClipboardCheck },
    { id: 'library', label: 'My library', icon: Library },
  ];

  const connectionLabel = serverStatus === 'checking' ? 'Connecting' : serverStatus === 'offline' ? 'Server offline' : configured ? 'Gemma ready' : 'API key needed';
  const fileTypeLabel = file ? getExtension(file.name).replace('.', '').toUpperCase() : '';
  const currentDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-collapsed'}`} onDragEnter={(event) => {
      if ([...event.dataTransfer.types].includes('Files')) { event.preventDefault(); fileDragDepthRef.current += 1; setDragging(true); }
    }} onDragOver={(event) => { if ([...event.dataTransfer.types].includes('Files')) event.preventDefault(); }} onDragLeave={() => {
      fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
      if (fileDragDepthRef.current === 0) setDragging(false);
    }} onDrop={(event) => {
      event.preventDefault(); fileDragDepthRef.current = 0; setDragging(false);
      if (activeView === 'compare') {
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) handleComparePickedFile(compareA ? 'B' : 'A', dropped);
      } else handlePickedFile(event.dataTransfer.files?.[0]);
    }}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'} ${mobileNavOpen ? 'mobile-visible' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><span>N</span><i /></div>
          {sidebarOpen && <div className="brand-name"><strong>notice<span>lens</span></strong><small>DOCUMENT INTELLIGENCE</small></div>}
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((value) => !value)} title="Collapse sidebar"><PanelLeftClose size={17} /></button>
        </div>
        {sidebarOpen && <div className="nav-section-label">WORKSPACE</div>}
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={activeView === id ? 'active' : ''} onClick={() => navigate(id)} title={label}>
              <Icon size={18} /><span>{sidebarOpen ? label : ''}</span>
              {id === 'actions' && actionSteps.length > 0 && sidebarOpen && <b>{Math.max(0, actionSteps.length - completedTasks.length)}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        {sidebarOpen && <div className="privacy-card"><ShieldCheck size={16} /><div><strong>Your files stay temporary</strong><p>Files are processed for each request. Recent activity stores filenames and summaries in this browser only.</p></div></div>}
        <button className="sidebar-theme" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          {sidebarOpen && <span>Switch to {theme === 'light' ? 'dark' : 'light'} mode</span>}
        </button>
        <div className="sidebar-model"><span className={`status-dot ${serverStatus}`} /><div>{sidebarOpen && <><strong>{connectionLabel}</strong><small>Gemma 4 · {model}</small></>}</div></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setMobileNavOpen((value) => !value)} aria-label="Toggle navigation"><Menu size={19} /></button>
            <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{viewNames[activeView]}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className={`connection-pill ${serverStatus}`}><i />{connectionLabel}</span>
            <label className="topbar-language" title="AI response language"><Languages size={14} /><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="AI response language"><option>English</option><option>Hindi</option></select></label>
            <button className="theme-toggle" onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label="Toggle dark mode">
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button className="topbar-upload" onClick={() => { navigate('analyse'); window.setTimeout(() => mainInputRef.current?.click(), 0); }}><Plus size={16} /> <span>New document</span></button>
          </div>
        </header>

        <div className="page-content">
          {activeView === 'home' && (
            <>
              <section className="welcome-row"><div><p className="eyebrow">{currentDate}</p><h1>Documents, made <span>clear.</span></h1><p>Understand complex files, compare versions and know what to do next.</p></div><div className="welcome-orb"><Sparkles size={25} /></div></section>
              {!configured && <div className="notice-banner"><AlertCircle size={17} /><span><strong>Gemma needs an API key.</strong> Add <code>GEMINI_API_KEY</code> to <code>server/.env</code>, then restart NoticeLens.</span></div>}
              {error && <div className="error-banner"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
              <section className="home-upload-card">
                <div className="home-upload-copy"><span className="subtle-kicker">START WITH A DOCUMENT</span><h2>What would you like to understand?</h2><p>Drop a document here, or choose a file to begin.</p></div>
                <button className="upload-dropzone" onClick={() => mainInputRef.current?.click()}>
                  <span className="upload-symbol"><UploadCloud size={22} /></span><strong>Choose a document</strong><small>PDF, image, Word, Excel, PowerPoint or text</small><span className="format-pills">PDF <i /> DOCX <i /> XLSX <i /> PPTX <i /> JPG/PNG <i /> TXT/CSV</span>
                </button>
                <div className="upload-bottom"><span><ShieldCheck size={14} /> Temporary processing · max 12 MB per file</span><button className="sample-link" onClick={loadSample}>Try sample document <ArrowRight size={14} /></button></div>
              </section>
              <section className="quick-actions">
                <button onClick={() => navigate('analyse')}><span className="quick-icon blue"><FileSearch size={19} /></span><span><strong>Analyse a document</strong><small>Summaries, key details and actions</small></span><ArrowRight size={16} /></button>
                <button onClick={() => navigate('compare')}><span className="quick-icon violet"><ArrowLeftRight size={19} /></span><span><strong>Compare two documents</strong><small>Find changes and personal impact</small></span><ArrowRight size={16} /></button>
                <button onClick={() => navigate('assistant')}><span className="quick-icon green"><MessageCircle size={19} /></span><span><strong>Ask the AI assistant</strong><small>Ask in English or Hindi by text or voice</small></span><ArrowRight size={16} /></button>
              </section>
              <section className="recent-section">
                <div className="section-title-row"><div><h2>Recent activity</h2><p>Pick up where you left off.</p></div><button className="text-button" onClick={() => navigate('library')}>View library <ArrowRight size={14} /></button></div>
                {history.length ? <div className="recent-list">{history.slice(0, 4).map((item) => <div className="recent-item" key={item.id}><span className="recent-file-icon"><FileText size={18} /></span><div className="recent-item-copy"><strong>{item.title}</strong><small>{item.fileName} · {item.category}</small></div><time>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(item.date))}</time></div>)}</div> : <div className="recent-empty"><History size={17} /><span>Your analysed documents will appear here.</span></div>}
              </section>
            </>
          )}

          {activeView === 'analyse' && (
            <>
              <section className="page-intro"><div><p className="eyebrow">DOCUMENT ANALYSIS</p><h1>Understand any document.</h1><p>Upload a file to extract its purpose, important details, obligations, dates and next steps.</p></div><div className="intro-icon"><FileSearch size={22} /></div></section>
              {error && <div className="error-banner"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
              <section className="upload-workspace">
                {!file ? <button className="large-dropzone" onClick={() => mainInputRef.current?.click()}><span className="large-dropzone-icon"><UploadCloud size={26} /></span><strong>Choose a file or drop it here</strong><span>PDF, JPG, PNG, WEBP, DOCX, XLSX, XLS, PPTX, TXT, MD or CSV</span><small>Maximum file size: 12 MB</small></button> : <div className="chosen-file-card"><div className="chosen-file-icon"><FileText size={24} /></div><div className="chosen-file-info"><strong>{file.name}</strong><span>{fileTypeLabel} · {formatBytes(file.size)}</span></div><button className="icon-button" onClick={() => resetForFile(null)} aria-label="Remove selected file"><X size={17} /></button></div>}
                <div className="analysis-control-row"><div><span className={`status-dot ${configured ? 'online' : 'offline'}`} /><span>{configured ? `Gemma ready · ${model}` : 'Add your API key to enable AI analysis'}</span></div><button className="button-primary" onClick={analyseDocument} disabled={!file || isAnalyzing || !configured}>{isAnalyzing ? <><LoaderCircle className="spin" size={17} /> Analysing…</> : <><Sparkles size={16} /> Analyse document</>}</button></div>
              </section>
              {analysis && <AnalysisResults analysis={analysis} countdown={countdown} actionSteps={actionSteps} completedTasks={completedTasks} completionPercent={completionPercent} toggleTask={toggleTask} eligibilityDetails={eligibilityDetails} setEligibilityDetails={setEligibilityDetails} onEligibilityCheck={runEligibilityCheck} onAsk={() => navigate('assistant')} onActions={() => navigate('actions')} />}
              {!analysis && !file && <div className="supported-note"><ShieldCheck size={15} /><span>Documents are sent to Google for Gemma processing. Avoid uploading confidential files unless you are comfortable with that.</span></div>}
            </>
          )}

          {activeView === 'compare' && (
            <>
              <section className="page-intro"><div><p className="eyebrow">DOCUMENT COMPARISON</p><h1>See what changed.</h1><p>Compare two versions and understand which differences matter to your priorities.</p></div><div className="intro-icon violet"><ArrowLeftRight size={22} /></div></section>
              {error && <div className="error-banner"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
              <div className="compare-demo-row"><span>Want to preview the comparison flow?</span><button className="text-button" onClick={loadComparisonSample}>Load fictional sample pair <ArrowRight size={14} /></button></div>
              <div className="compare-pair-grid">
                <CompareUploadCard label="Original / baseline" subtitle="The older or first document" file={compareA} inputRef={compareARef} onPick={(next) => handleComparePickedFile('A', next)} onRemove={() => { setCompareA(null); setCompareResult(null); }} />
                <CompareUploadCard label="Second / revised" subtitle="The newer or second document" file={compareB} inputRef={compareBRef} onPick={(next) => handleComparePickedFile('B', next)} onRemove={() => { setCompareB(null); setCompareResult(null); }} />
              </div>
              <section className="preferences-card"><div className="preferences-heading"><div className="quick-icon violet"><GraduationCap size={18} /></div><div><strong>Personalise the recommendation <span>Optional</span></strong><p>Tell NoticeLens what matters to you. It will explain trade-offs using only these preferences.</p></div></div><textarea value={comparePreferences} onChange={(event) => setComparePreferences(event.target.value)} rows={3} maxLength={1200} placeholder="Example: I prefer a higher stipend, remote work and a location near Delhi. For a policy, I care most about flexibility and lower costs." /></section>
              <div className="compare-action-row"><p><ShieldCheck size={14} /> Both documents are processed for this comparison; files are not saved.</p><button className="button-primary" onClick={compareDocuments} disabled={!compareA || !compareB || isComparing || !configured}>{isComparing ? <><LoaderCircle className="spin" size={17} /> Comparing…</> : <><ArrowLeftRight size={16} /> Compare documents</>}</button></div>
              {!configured && <div className="supported-note warning"><AlertCircle size={15} /><span>Configure <code>GEMINI_API_KEY</code> in <code>server/.env</code> to enable comparison.</span></div>}
              {compareResult && <ComparisonResults result={compareResult} />}
            </>
          )}

          {activeView === 'assistant' && (
            <>
              <section className="page-intro"><div><p className="eyebrow">GEMMA 4 · VOICE + CHAT</p><h1>Ask in your own words.</h1><p>Ask questions about the document you analysed. Speak or type in English or Hindi.</p></div><div className="intro-icon green"><Mic size={22} /></div></section>
              {!file || !analysis ? <section className="empty-workspace"><EmptyPanel icon={MessageCircle} title="Analyse a document first" description="The assistant needs a source document so its answers can be grounded in the file." /><button className="button-primary" onClick={() => navigate('analyse')}>Go to document analysis <ArrowRight size={15} /></button></section> : (
                <section className="assistant-panel">
                  <div className="assistant-toolbar"><div className="assistant-source"><span className="assistant-orb"><Sparkles size={16} /></span><div><strong>Document assistant</strong><small>Using: {file.name}</small></div></div><div className="assistant-controls"><span className="model-label">Gemma 4 · {language}</span></div></div>
                  <div className="chat-thread">
                    {messages.map((message, index) => <div className={`chat-row ${message.role}`} key={`${index}-${message.role}`}><div className="chat-avatar">{message.role === 'assistant' ? <Sparkles size={15} /> : 'You'}</div><div className="chat-message-content"><p>{message.content}</p>{message.evidenceQuotes?.length > 0 && <div className="chat-evidence"><span>FROM THE DOCUMENT</span>{message.evidenceQuotes.map((quote, quoteIndex) => <blockquote key={quoteIndex}>“{quote}”</blockquote>)}</div>}{message.notInDocument && <div className="not-found-note"><CircleHelp size={14} /> This detail was not found in the uploaded document.</div>}{message.confidence && <small className="confidence-label">{message.confidence} confidence · document-grounded</small>}{message.role === 'assistant' && <button className="speak-button" onClick={() => speakText(message.content)} title="Read this response aloud"><Volume2 size={14} /> Listen</button>}</div></div>)}
                    {isAsking && <div className="chat-row assistant"><div className="chat-avatar"><Sparkles size={15} /></div><div className="chat-message-content typing"><i /><i /><i /></div></div>}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="suggestion-row">{(language === 'Hindi' ? ['इस दस्तावेज़ का सारांश बताओ।', 'मुझे क्या करना है?', 'कौन-सी तारीख़ महत्वपूर्ण है?'] : ['Summarise this document', 'What should I do next?', 'Which details should I verify?']).map((item) => <button key={item} onClick={() => askQuestion(item)} disabled={isAsking}>{item}</button>)}</div>
                  <form className="assistant-input" onSubmit={(event) => { event.preventDefault(); askQuestion(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={language === 'Hindi' ? 'अपने दस्तावेज़ के बारे में पूछें…' : 'Ask something about your document…'} maxLength={1000} /><button type="button" className={`voice-button ${isListening ? 'listening' : ''}`} onClick={isListening ? stopVoiceInput : startVoiceInput} title={isListening ? 'Stop listening' : 'Ask with your voice'}>{isListening ? <MicOff size={18} /> : <Mic size={18} />}</button><button type="submit" className="send-button" disabled={!question.trim() || isAsking}><Send size={17} /></button></form>
                  <div className="voice-note"><span className={isListening ? 'listening-dot' : ''} />{isListening ? 'Listening… Speak now. Your question will be sent when you finish.' : 'Voice input uses your browser microphone. Spoken replies use your device voice.'}</div>
                </section>
              )}
            </>
          )}

          {activeView === 'actions' && (
            <>
              <section className="page-intro"><div><p className="eyebrow">YOUR NEXT STEPS</p><h1>Turn insight into action.</h1><p>Track the tasks and requirements extracted from your current document.</p></div><div className="intro-icon green"><ClipboardCheck size={22} /></div></section>
              {analysis ? <><section className="content-card action-centre"><div className="action-progress-head"><div><strong>{completedTasks.length} of {actionSteps.length} completed</strong><small>{analysis.title || file?.name || 'Current document'}</small></div><b>{completionPercent}%</b></div><div className="progress-line"><span style={{ width: `${completionPercent}%` }} /></div>{actionSteps.length ? <div className="action-task-list">{actionSteps.map((task, index) => <label className={`action-task ${completedTasks.includes(index) ? 'done' : ''}`} key={index}><input type="checkbox" checked={completedTasks.includes(index)} onChange={() => toggleTask(index)} /><span className="custom-check"><Check size={13} /></span><span className="action-task-copy"><strong>{task.task || task}</strong>{task.detail && <small>{task.detail}</small>}{task.evidence && <Evidence>{task.evidence}</Evidence>}</span><span className="task-state">{completedTasks.includes(index) ? 'DONE' : 'TO DO'}</span></label>)}</div> : <EmptyPanel icon={ClipboardCheck} title="No action steps found" description="This document may be informational or a record. There may be nothing to complete." />}</section><section className="content-card action-dates-card"><SectionHeading icon={CalendarDays} title="Important dates" description="Deadlines and events explicitly mentioned in this document." />{analysis.deadline?.label && <div className="deadline-callout"><span>DEADLINE</span><strong>{analysis.deadline.dateISO ? formatDate(analysis.deadline.dateISO) : analysis.deadline.label}</strong>{getCountdown(analysis.deadline.dateISO) && <small>{getCountdown(analysis.deadline.dateISO).label}</small>}{analysis.deadline.evidence && <Evidence>{analysis.deadline.evidence}</Evidence>}</div>}{asArray(analysis.importantDates).length ? asArray(analysis.importantDates).map((item, index) => <div className="mini-date-row" key={index}><span className="date-marker"/><div><strong>{item.label || 'Important date'}</strong><small>{item.dateText || (item.dateISO ? formatDate(item.dateISO) : 'Date unclear')}</small>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div></div>) : !analysis.deadline?.label && <p className="muted-copy">No action-related dates were found.</p>}{asArray(analysis.recordDates).length > 0 && <div className="record-date-box"><strong>Record dates · not deadlines</strong>{analysis.recordDates.map((item, index) => <p key={index}>{item.label}: {item.dateText}</p>)}</div>}</section></> : <section className="empty-workspace"><EmptyPanel icon={ClipboardCheck} title="No active document" description="Analyse a document to generate its action checklist." /><button className="button-primary" onClick={() => navigate('analyse')}>Analyse a document <ArrowRight size={15} /></button></section>}
            </>
          )}

          {activeView === 'library' && (
            <>
              <section className="page-intro"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Recent documents.</h1><p>NoticeLens keeps a lightweight activity list in this browser. Original files are not stored.</p></div><div className="intro-icon"><Library size={22} /></div></section>
              <section className="library-panel"><div className="library-toolbar"><div className="search-box"><Search size={16} /><input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Search recent documents" /></div><button className="text-button danger-text" onClick={clearHistory} disabled={!history.length}>Clear history</button></div>
                {filteredHistory.length ? <div className="library-list">{filteredHistory.map((item) => <article className="library-item" key={item.id}><span className="library-file-icon"><FileText size={20} /></span><div className="library-item-copy"><strong>{item.title}</strong><small>{item.fileName} · {item.category}</small>{item.summary && <p>{item.summary}</p>}</div><time>{new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.date))}</time></article>)}</div> : <EmptyPanel icon={History} title="No matching documents" description="Analyse a document and its activity will appear here." />}
              </section>
            </>
          )}
        </div>
        <footer className="app-footer"><span>NoticeLens · Document intelligence</span><span><span className="footer-status-dot" /> Powered by Gemma 4</span></footer>
      </main>

      <input ref={mainInputRef} type="file" accept={ACCEPT_STRING} hidden onChange={(event) => { handlePickedFile(event.target.files?.[0]); event.currentTarget.value = ''; }} />
      <input ref={compareARef} type="file" accept={ACCEPT_STRING} hidden onChange={(event) => { handleComparePickedFile('A', event.target.files?.[0]); event.currentTarget.value = ''; }} />
      <input ref={compareBRef} type="file" accept={ACCEPT_STRING} hidden onChange={(event) => { handleComparePickedFile('B', event.target.files?.[0]); event.currentTarget.value = ''; }} />
      {dragging && <div className="global-drag-overlay"><div><UploadCloud size={34} /><strong>Drop your document</strong><span>{activeView === 'compare' ? 'First drop fills the original slot, next drop fills the second slot.' : 'Release to select it for analysis.'}</span></div></div>}
      {toast && <div className="toast"><CheckCircle2 size={16} />{toast}</div>}
    </div>
  );
}

function CompareUploadCard({ label, subtitle, file, inputRef, onPick, onRemove }) {
  return (
    <section className={`compare-file-card ${file ? 'has-file' : ''}`}>
      <div className="compare-file-heading"><span>{label.startsWith('Original') ? 'A' : 'B'}</span><div><strong>{label}</strong><small>{subtitle}</small></div></div>
      {file ? <div className="compare-file-selected"><FileText size={19} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)}</small></div><button className="icon-button" onClick={onRemove} aria-label="Remove file"><X size={15} /></button></div> : <button className="compare-dropzone" onClick={() => inputRef.current?.click()}><UploadCloud size={22} /><strong>Choose document</strong><small>PDF, image, Office or text · max 12 MB</small></button>}
      {file && <button className="replace-file-button" onClick={() => inputRef.current?.click()}>Replace document</button>}
    </section>
  );
}

function AnalysisResults({ analysis, countdown, actionSteps, completedTasks, completionPercent, toggleTask, eligibilityDetails, setEligibilityDetails, onEligibilityCheck, onAsk, onActions }) {
  const keyPoints = asArray(analysis.keyPoints);
  const eligibility = asArray(analysis.eligibility);
  const documents = asArray(analysis.documentsRequired);
  const dates = asArray(analysis.importantDates);
  const financial = asArray(analysis.financialDetails);
  const category = String(analysis.documentCategory || 'document').replaceAll('_', ' ');
  return (
    <div className="analysis-results">
      <div className="results-title-row"><div><p className="eyebrow">ANALYSIS RESULT</p><h2>{analysis.title || 'Document analysis'}</h2><p>{analysis.organization || 'Organisation not specified'} · {category}</p></div><span className="result-tag"><BadgeCheck size={14} /> Analysed</span></div>
      <section className="summary-card"><div className="summary-card-icon"><Sparkles size={19} /></div><div><span>IN SIMPLE WORDS</span><p>{analysis.summary || analysis.documentPurpose || 'No summary was returned for this document.'}</p>{analysis.documentPurpose && <small>{analysis.documentPurpose}</small>}</div></section>
      <div className="analysis-grid">
        <div className="analysis-main-column">
          <section className="content-card"><SectionHeading icon={FileText} title="Key information" description="The main points identified in the document." />{keyPoints.length ? <div className="key-point-list">{keyPoints.map((item, index) => <div className="key-point" key={index}><span><Check size={13} /></span><div><p>{item.text || item}</p>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div></div>)}</div> : <p className="muted-copy">No key points were confidently extracted.</p>}</section>
          {asArray(analysis.keyTerms).length > 0 && <section className="content-card"><SectionHeading icon={BookOpen} title="Terms explained" description="Complex language translated into plain language." />{analysis.keyTerms.map((item, index) => <div className="term-row" key={index}><strong>{item.term}</strong><p>{item.explanation}</p>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div>)}</section>}
          <section className="content-card"><SectionHeading icon={GraduationCap} title="Requirements and conditions" description="Eligibility or conditions stated by the document." />{eligibility.length ? eligibility.map((item, index) => <div className="detail-row" key={index}><CheckCircle2 size={16} /><div><p>{item.requirement || item}</p>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div></div>) : <p className="muted-copy">No explicit eligibility or conditions were identified.</p>}</section>
          <section className="content-card eligibility-check-card"><SectionHeading icon={GraduationCap} title="Check how this applies to you" description="Optional. NoticeLens will compare your details with the criteria above." /><textarea value={eligibilityDetails} onChange={(event) => setEligibilityDetails(event.target.value)} rows={3} maxLength={1000} placeholder="Example: I am a 2nd-year undergraduate, my CGPA is 7.2 and my family income is INR 4.8 lakh."/><button className="button-primary eligibility-button" onClick={onEligibilityCheck} disabled={!eligibilityDetails.trim()}><Sparkles size={15}/> Check my situation</button><small className="privacy-helper">Only provide details relevant to this document. The result is an AI assessment, not an official decision.</small></section>
          {financial.length > 0 && <section className="content-card"><SectionHeading icon={FileSpreadsheet} title="Amounts and figures" description="Financial values explicitly found in the document." />{financial.map((item, index) => <div className="financial-row" key={index}><div><strong>{item.label || 'Amount'}</strong><small>{item.context || 'As stated in the source'}</small>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div><b>{item.amount || 'Not stated'}</b></div>)}</section>}
        </div>
        <div className="analysis-side-column">
          <section className="content-card"><SectionHeading icon={CalendarDays} title="Important dates" description="Action dates are kept separate from record dates." />{analysis.deadline?.label && <div className="deadline-callout"><span>DEADLINE</span><strong>{analysis.deadline.dateISO ? formatDate(analysis.deadline.dateISO) : analysis.deadline.label}</strong>{countdown && <small className={countdown.past ? 'past' : ''}>{countdown.label}</small>}{analysis.deadline.evidence && <Evidence>{analysis.deadline.evidence}</Evidence>}</div>}{dates.length ? dates.map((item, index) => <div className="mini-date-row" key={index}><span className="date-marker" /><div><strong>{item.label || 'Important date'}</strong><small>{item.dateText || (item.dateISO ? formatDate(item.dateISO) : 'Date unclear')}</small>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div></div>) : !analysis.deadline?.label && <p className="muted-copy">No action-related dates were identified.</p>}{asArray(analysis.recordDates).length > 0 && <div className="record-date-box"><strong>Recorded dates · not deadlines</strong>{analysis.recordDates.map((item, index) => <p key={index}>{item.label}: {item.dateText}</p>)}</div>}</section>
          <section className="content-card"><SectionHeading icon={FileCheck2} title="Documents or items needed" />{documents.length ? documents.map((item, index) => <div className="document-needed-row" key={index}><FileText size={15} /><div><strong>{item.document || item}</strong>{item.evidence && <Evidence>{item.evidence}</Evidence>}</div></div>) : <p className="muted-copy">No document requirements were found.</p>}</section>
          <section className="content-card mini-action-card"><SectionHeading icon={ClipboardCheck} title="Next steps" description={`${completedTasks.length} of ${actionSteps.length} completed`} /><div className="progress-line"><span style={{ width: `${completionPercent}%` }} /></div>{actionSteps.slice(0, 4).map((item, index) => <label className={`mini-task ${completedTasks.includes(index) ? 'done' : ''}`} key={index}><input type="checkbox" checked={completedTasks.includes(index)} onChange={() => toggleTask(index)} /><span className="custom-check"><Check size={12} /></span><strong>{item.task || item}</strong></label>)}{actionSteps.length === 0 && <p className="muted-copy">No follow-up actions were identified.</p>}<button className="inline-link" onClick={onActions}>Open action centre <ArrowRight size={14} /></button></section>
          <button className="ask-next-card" onClick={onAsk}><span><MessageCircle size={18} /></span><div><strong>Have a question?</strong><small>Ask Gemma about this document.</small></div><ArrowRight size={16} /></button>
        </div>
      </div>
      {asArray(analysis.cautions).length > 0 && <div className="caution-box"><AlertCircle size={16} /><div><strong>Things to verify</strong><ul>{analysis.cautions.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div>}
      <p className="verification-note"><ShieldCheck size={14} /> Verify important dates, amounts and obligations against the original document.</p>
    </div>
  );
}

function ComparisonResults({ result }) {
  const changes = asArray(result.changes);
  const unchanged = asArray(result.unchanged);
  const conflicts = asArray(result.potentialConflicts);
  const actions = asArray(result.recommendedActions);
  const recommendation = result.personalisedRecommendation || {};
  return (
    <section className="comparison-results">
      <div className="results-title-row"><div><p className="eyebrow">COMPARISON REPORT</p><h2>{result.comparisonTitle || 'Document comparison'}</h2><p>Content comparison · evidence from both documents</p></div><span className="result-tag"><BadgeCheck size={14} /> Complete</span></div>
      <div className="summary-card"><div className="summary-card-icon"><Sparkles size={19} /></div><div><span>THE BIG PICTURE</span><p>{result.overallAssessment || 'Review the changes below.'}</p></div></div>
      <div className="compare-document-pair"><div><span>DOCUMENT A · BASELINE</span><strong>{result.documentA?.title || 'Original document'}</strong><small>{result.documentA?.category || 'Document'}</small></div><ArrowLeftRight size={18} /><div><span>DOCUMENT B · SECOND VERSION</span><strong>{result.documentB?.title || 'Second document'}</strong><small>{result.documentB?.category || 'Document'}</small></div></div>
      <div className="compare-stats"><div><strong>{changes.length}</strong><span>Changes found</span></div><div><strong>{changes.filter((item) => item.impact === 'high').length}</strong><span>High impact</span></div><div><strong>{unchanged.length}</strong><span>Unchanged items</span></div></div>
      <section className="content-card"><SectionHeading icon={FileDiff} title="What changed" description="Meaningful differences, with supporting evidence." />{changes.length ? <div className="changes-list">{changes.map((item, index) => <article className="change-card" key={index}><div className="change-card-heading"><div><span className="change-category">{String(item.category || 'other').replaceAll('_', ' ')}</span><h3>{item.label || 'Changed detail'}</h3></div><div className="change-badges"><span className={`impact-badge ${item.impact || 'low'}`}>{item.impact || 'low'} impact</span><span className="change-type">{item.changeType || 'modified'}</span></div></div><div className="change-values"><div><span>ORIGINAL</span><p>{item.oldValue || 'Not stated'}</p>{item.evidenceA && <Evidence>{item.evidenceA}</Evidence>}</div><div><span>SECOND VERSION</span><p>{item.newValue || 'Not stated'}</p>{item.evidenceB && <Evidence>{item.evidenceB}</Evidence>}</div></div>{item.whyItMatters && <div className="change-impact-note"><Zap size={14} />{item.whyItMatters}</div>}</article>)}</div> : <EmptyPanel icon={CheckCircle2} title="No clear changes identified" description="The analysis did not identify substantive changes. Verify the original files before relying on this result." />}</section>
      <section className="content-card recommendation-card"><SectionHeading icon={GraduationCap} title="Personalised recommendation" description="Based on the preferences you supplied, not a universal ranking." /><div className="recommendation-title">{recommendation.recommendation || 'No preference-based recommendation available'}</div><p>{recommendation.reasoning || 'Add personal preferences before comparing to receive a tailored recommendation.'}</p>{recommendation.confidence && <span className="confidence-label">Confidence: {String(recommendation.confidence).replaceAll('_', ' ')}</span>}{asArray(recommendation.preferenceMatches).length > 0 && <div className="recommendation-columns"><div><strong>What matches</strong>{recommendation.preferenceMatches.map((item, index) => <p key={index}><CheckCircle2 size={14} />{item}</p>)}</div><div><strong>Trade-offs</strong>{asArray(recommendation.tradeOffs).map((item, index) => <p key={index}><AlertCircle size={14} />{item}</p>)}</div></div>}</section>
      {result.versionAssessment && <section className="content-card"><SectionHeading icon={Clock3} title="Version and authority check" description="Recency is not the same as official validity." /><div className="version-assessment"><div><span>Latest evidenced version</span><strong>{result.versionAssessment.newerDocument || 'Cannot determine'}</strong></div><div><span>Explicit supersession</span><strong>{result.versionAssessment.explicitSupersession || 'Unclear'}</strong></div></div><p className="version-notes">{result.versionAssessment.authorityNotes || 'The comparison does not establish which version is officially in force.'}</p>{result.versionAssessment.recencyEvidenceA && <Evidence>{`Document A: ${result.versionAssessment.recencyEvidenceA}`}</Evidence>}{result.versionAssessment.recencyEvidenceB && <Evidence>{`Document B: ${result.versionAssessment.recencyEvidenceB}`}</Evidence>}</section>}
      {conflicts.length > 0 && <section className="content-card"><SectionHeading icon={AlertCircle} title="Potential conflicts" description="Items that may need human verification." />{conflicts.map((item, index) => <div className="conflict-row" key={index}><strong>{item.issue}</strong><p>{item.detail}</p>{item.evidenceA && <Evidence>{`Document A: ${item.evidenceA}`}</Evidence>}{item.evidenceB && <Evidence>{`Document B: ${item.evidenceB}`}</Evidence>}</div>)}</section>}
      {actions.length > 0 && <section className="content-card"><SectionHeading icon={ClipboardCheck} title="Recommended next steps" />{actions.map((item, index) => <div className="recommend-action" key={index}><CheckCircle2 size={15} />{item}</div>)}</section>}
      {asArray(result.caveats).length > 0 && <div className="caution-box"><AlertCircle size={16} /><div><strong>Before you act</strong><ul>{result.caveats.map((item, index) => <li key={index}>{item}</li>)}</ul></div></div>}
      <p className="verification-note"><ShieldCheck size={14} /> NoticeLens compares document content; it cannot confirm authenticity or legal validity.</p>
    </section>
  );
}

export default App;
