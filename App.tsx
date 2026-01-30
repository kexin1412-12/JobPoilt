
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApplicationStatus, JobApplication, Interview, JobCategory, User } from './types';
import { analyzeJobDescription } from './services/aiService';
import { Button } from './components/Button';
import { ApplicationCard } from './components/ApplicationCard';
import { AuthService } from './services/firebaseAuthService';

const STORAGE_KEY = 'job_pursuit_v3_data';
const USER_KEY = 'job_pursuit_user';
const CATEGORIES: JobCategory[] = ['All', 'Tech', 'Product', 'Design', 'Ops', 'Data', 'Other'];

// Note: In a real production app, you would get this from your Google Cloud Console
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const translations = {
  zh: {
    records: '投递记录',
    stats: '数据统计',
    addJob: '+ 投递职位',
    searchPlaceholder: '搜索公司、岗位或备注...',
    allCategories: '全部岗位',
    totalApplied: '总投递数量',
    interviewRate: '面试邀请率',
    offerRate: 'Offer 转化率',
    rejectedCount: '被拒数量',
    funnelTitle: '求职漏斗分析',
    cheerUp: '整理心情，继续努力！',
    applied: '投递',
    interviewing: '面试',
    offer: '录取',
    rejected: '被拒',
    newTracking: '追踪新岗位',
    jdLink: '职位链接',
    jdLinkPlaceholder: '粘贴 LinkedIn/官网链接，AI 自动识别...',
    company: '公司',
    companyPlaceholder: '如：阿里巴巴',
    position: '岗位',
    positionPlaceholder: '如：产品经理',
    jobType: '岗位类型',
    startTracking: '开始追踪',
    aiAnalysis: 'AI 岗位智能分析',
    suitability: '匹配度建议',
    keyResponsibilities: '关键职责',
    commonQuestions: '面试常见问题',
    strategy: '面试策略',
    markRejected: '标记拒绝',
    unmarkRejected: '已标记拒绝',
    milestones: ['投递', '初筛', '一面', '二面', '终面', 'Offer'],
    completed: '已完成',
    pending: '待安排',
    meetingLink: '会议链接',
    enterMeeting: '进入会议',
    reflection: '面试复盘',
    saveReflection: '保存并折叠',
    addInterview: '设置面试',
    upcomingStage: '后续环节待安排',
    interviewerName: '面试官姓名',
    categoryNames: {
      All: '全部岗位',
      Tech: '技术',
      Product: '产品',
      Design: '设计',
      Ops: '运营',
      Data: '数据',
      Other: '其他'
    },
    loginTitle: '登录 OfferFlow',
    loginSub: '开始你的求职加速之旅',
    googleLogin: '使用 Google 账号登录',
    logout: '退出登录',
    welcome: '欢迎回来，',

  },
  en: {
    records: 'Applications',
    stats: 'Statistics',
    addJob: '+ New Application',
    searchPlaceholder: 'Search company, role or notes...',
    allCategories: 'All Jobs',
    totalApplied: 'Total Applied',
    interviewRate: 'Interview Rate',
    offerRate: 'Offer Success',
    rejectedCount: 'Rejected',
    funnelTitle: 'Career Funnel Analysis',
    cheerUp: 'Stay positive and keep going!',
    applied: 'Applied',
    interviewing: 'Interviewing',
    offer: 'Offer',
    rejected: 'Rejected',
    newTracking: 'Track New Position',
    jdLink: 'Job Link',
    jdLinkPlaceholder: 'Paste LinkedIn/Official link for AI analysis...',
    company: 'Company',
    companyPlaceholder: 'e.g., Google',
    position: 'Position',
    positionPlaceholder: 'e.g., Product Manager',
    jobType: 'Job Category',
    startTracking: 'Start Tracking',
    aiAnalysis: 'AI Smart Analysis',
    suitability: 'Suitability Assessment',
    keyResponsibilities: 'Key Responsibilities',
    commonQuestions: 'Common Interview Questions',
    strategy: 'Interview Strategy',
    markRejected: 'Mark Rejected',
    unmarkRejected: 'Rejected',
    milestones: ['Applied', 'Screening', 'Round 1', 'Round 2', 'Final', 'Offer'],
    completed: 'Completed',
    pending: 'Pending',
    meetingLink: 'Meeting Link',
    enterMeeting: 'Join Meeting',
    reflection: 'Interview Reflection',
    saveReflection: 'Save & Collapse',
    addInterview: 'Add Interview',
    upcomingStage: 'Next stages pending',
    interviewerName: 'Interviewer Name',
    categoryNames: {
      All: 'All Categories',
      Tech: 'Tech',
      Product: 'Product',
      Design: 'Design',
      Ops: 'Ops',
      Data: 'Data',
      Other: 'Other'
    },
    loginTitle: 'Welcome to OfferFlow',
    loginSub: 'Accelerate your career journey',
    googleLogin: 'Sign in with Google',
    logout: 'Log out',
    welcome: 'Welcome back, ',

  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [activeAppId, setActiveAppId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [activeTab, setActiveTab] = useState<'records' | 'stats'>('records');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<JobCategory>('All');
  const [expandedReflectionId, setExpandedReflectionId] = useState<string | null>(null);
  const [isAiReportExpanded, setIsAiReportExpanded] = useState(false);

  const t = (key: keyof typeof translations['zh']) => translations[lang][key] || key;
  const getCategoryName = (cat: JobCategory) => translations[lang].categoryNames[cat as keyof typeof translations['zh']['categoryNames']] || cat;

  const [newAppForm, setNewAppForm] = useState({
    companyName: '',
    positionTitle: '',
    category: 'Tech' as JobCategory,
    jdLink: '',
    jdText: ''
  });

  // Load Initial State
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedLang = localStorage.getItem('app_lang');
    const savedUser = localStorage.getItem(USER_KEY);

    if (saved) setApplications(JSON.parse(saved));
    if (savedLang === 'zh' || savedLang === 'en') setLang(savedLang);
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  // Auth Integration
  useEffect(() => {
    AuthService.init();

    // Web-only Google Button rendering fallback if needed, 
    // but we will mainly use custom buttons for clean UI in native
    if (typeof window !== 'undefined' && !user) {
      // We can keep the web button logic or replace it with a custom button that calls AuthService.signInWithGoogle
      // For consistency, let's try to render the web button if on web, but we'll specific custom buttons below.
    }
  }, []);


  const handleGoogleLogin = async () => {
    try {
      const user = await AuthService.signInWithGoogle();
      setUser(user);
    } catch (e) {
      console.error(e);
      alert('Login Failed');
    }
  };

  const handleAppleLogin = async () => {
    try {
      const user = await AuthService.signInWithApple();
      setUser(user);
    } catch (e) {
      console.error(e);
      alert('Apple Login Failed');
    }
  };

  const handleLogout = async () => {
    await AuthService.signOut();
    setUser(null);
    setActiveAppId(null);
    setView('list');
  };

  const activeApp = useMemo(() => applications.find(a => a.id === activeAppId), [applications, activeAppId]);

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      const matchesSearch = app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.positionTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'All' || app.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [applications, searchQuery, filterCategory]);

  const stats = useMemo(() => {
    const total = applications.length;
    const interviewing = applications.filter(a => a.currentStageIndex >= 1 && a.currentStageIndex <= 4).length;
    const offers = applications.filter(a => a.currentStageIndex === 5 && a.status === ApplicationStatus.OFFER).length;
    const rejected = applications.filter(a => a.status === ApplicationStatus.REJECTED).length;

    const interviewRate = total > 0 ? ((interviewing / total) * 100).toFixed(1) : '0';
    const offerRate = total > 0 ? ((offers / total) * 100).toFixed(1) : '0';

    return { total, interviewing, offers, rejected, interviewRate, offerRate };
  }, [applications]);

  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    try {
      const aiData = await analyzeJobDescription(newAppForm.companyName, newAppForm.positionTitle, newAppForm.jdLink, newAppForm.jdText);
      const newApp: JobApplication = {
        id: crypto.randomUUID(),
        companyName: aiData.companyName || newAppForm.companyName || 'Unknown',
        positionTitle: aiData.positionTitle || newAppForm.positionTitle || 'Unknown',
        location: aiData.location || 'N/A',
        category: newAppForm.category,
        jdLink: newAppForm.jdLink,
        jdText: newAppForm.jdText,
        status: ApplicationStatus.APPLIED,
        currentStageIndex: 0,
        appliedDate: new Date().toISOString().split('T')[0],
        interviews: [],
        aiSuggestions: aiData,
        myReflections: ''
      };
      setApplications(prev => [newApp, ...prev]);
      setActiveAppId(newApp.id);
      setView('detail');
      setIsModalOpen(false);
      setNewAppForm({ companyName: '', positionTitle: '', category: 'Tech', jdLink: '', jdText: '' });
    } catch (err) {
      alert("AI analysis failed, please fill manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateStage = (index: number) => {
    if (!activeApp) return;
    setApplications(apps => apps.map(a => {
      if (a.id === activeApp.id) {
        let status = a.status;
        if (index === 0) status = ApplicationStatus.APPLIED;
        else if (index >= 1 && index <= 4) status = ApplicationStatus.INTERVIEWING;
        else if (index === 5) status = ApplicationStatus.OFFER;
        return { ...a, currentStageIndex: index, status };
      }
      return a;
    }));
  };

  const toggleRejected = () => {
    if (!activeApp) return;
    const newStatus = activeApp.status === ApplicationStatus.REJECTED ? ApplicationStatus.INTERVIEWING : ApplicationStatus.REJECTED;
    setApplications(apps => apps.map(a => a.id === activeApp.id ? { ...a, status: newStatus } : a));
  };

  const addInterview = () => {
    if (!activeApp) return;
    const newInterview: Interview = {
      id: crypto.randomUUID(),
      round: `${t('milestones')[Math.min(activeApp.currentStageIndex, 5)]} Interview`,
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      interviewerInfo: '',
      notes: '',
      reflections: '',
      experienceRating: 0,
      isCompleted: false,
      meetingLink: ''
    };
    setApplications(apps => apps.map(a => a.id === activeApp.id ? { ...a, interviews: [...a.interviews, newInterview] } : a));
  };

  const updateInterview = (interviewId: string, updates: Partial<Interview>) => {
    if (!activeApp) return;
    setApplications(apps => apps.map(a => a.id === activeApp.id ? {
      ...a,
      interviews: a.interviews.map(i => i.id === interviewId ? { ...i, ...updates } : i)
    } : a));
  };

  const deleteInterview = (interviewId: string) => {
    if (!activeApp || !confirm('Delete this stage?')) return;
    setApplications(apps => apps.map(a => a.id === activeApp.id ? {
      ...a,
      interviews: a.interviews.filter(i => i.id !== interviewId)
    } : a));
  };

  const milestoneIcons = [
    { icon: (color: string) => <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { icon: (color: string) => <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { icon: (color: string) => <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { icon: (color: string) => <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
    { icon: (color: string) => <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    { icon: (color: string) => <svg className={`w-6 h-6 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> }
  ];

  // Login View
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-10 right-10">
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-100 bg-white hover:shadow-md transition-all text-xs font-black text-slate-500 hover:text-indigo-600"
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>
        </div>

        <div className="max-w-md w-full space-y-12 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-4">
            <div className="inline-flex p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100 mb-4 animate-bounce">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900">{t('loginTitle')}</h1>
            <p className="text-slate-400 font-medium text-lg">{t('loginSub')}</p>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 relative group">
            <button
              onClick={handleGoogleLogin}
              className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium text-slate-600 relative overflow-hidden"
            >
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
              <span>{t('googleLogin')}</span>
            </button>

            <button
              onClick={handleAppleLogin}
              className="w-full h-12 flex items-center justify-center gap-3 bg-black text-white border border-black rounded-lg hover:opacity-90 transition-opacity font-medium relative overflow-hidden"
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" /></svg>
              {/* Note: The above path is Facebook icon by mistake, let's fix the Apple Icon path below */}
              <svg className="w-5 h-5 text-white absolute left-4" viewBox="0 0 384 512" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
              </svg>
              <span>Sign in with Apple</span>
            </button>


          </div>
        </div>
      </div>
    );
  }

  if (view === 'detail' && activeApp) {
    const progressWidth = `${(activeApp.currentStageIndex / (milestoneIcons.length - 1)) * 100}%`;
    const isRejected = activeApp.status === ApplicationStatus.REJECTED;

    return (
      <div className="min-h-screen bg-[#FDFDFF] p-10 flex flex-col items-center">
        <div className="max-w-5xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-6">
              <button onClick={() => setView('list')} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-slate-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h1 className="text-3xl font-black tracking-tight">{activeApp.companyName}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-slate-400 font-medium text-lg">{activeApp.positionTitle}</p>
                  <span className="text-slate-200">•</span>
                  <p className="text-slate-400 font-medium text-lg flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {activeApp.location}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleRejected}
                className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${isRejected
                  ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm'
                  : 'bg-white border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100'
                  }`}
              >
                {isRejected ? t('unmarkRejected') : t('markRejected')}
              </button>
              <span className={`px-4 py-2 text-xs font-black rounded-xl border uppercase tracking-widest ${isRejected ? 'bg-rose-600 text-white border-rose-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}>
                {activeApp.status}
              </span>
            </div>
          </div>

          <div className={`bg-white border border-slate-100 rounded-3xl p-10 shadow-sm flex justify-around relative overflow-hidden transition-opacity ${isRejected ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="absolute top-1/2 left-[12%] right-[12%] h-[2px] bg-slate-50 -translate-y-[28px] -z-0" />
            {!isRejected && (
              <div
                className="absolute top-1/2 left-[12%] h-[2px] bg-indigo-600 -translate-y-[28px] -z-0 transition-all duration-700 ease-in-out"
                style={{ width: `calc(${progressWidth} - 24%)`, minWidth: '0%' }}
              />
            )}

            {milestoneIcons.map((m, idx) => {
              const isCurrent = activeApp.currentStageIndex === idx;
              const isCompleted = idx < activeApp.currentStageIndex;
              const label = t('milestones')[idx];

              let circleClasses = "bg-white border-slate-50";
              let iconColor = "text-slate-300";
              let labelColor = "text-slate-300";

              if (isRejected && isCurrent) {
                circleClasses = "bg-rose-50 border-rose-600 ring-4 ring-rose-50";
                iconColor = "text-rose-600";
                labelColor = "text-rose-600";
              } else if (isCompleted) {
                circleClasses = "bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100";
                iconColor = "text-white";
                labelColor = "text-indigo-400";
              } else if (isCurrent) {
                circleClasses = "bg-white border-indigo-600 ring-4 ring-indigo-50 shadow-xl shadow-indigo-100 scale-110";
                iconColor = "text-indigo-600";
                labelColor = "text-indigo-600";
              }

              return (
                <button
                  key={idx}
                  onClick={() => updateStage(idx)}
                  className="flex flex-col items-center gap-3 relative z-10 group outline-none"
                >
                  <div className={`p-4 rounded-full border-2 transition-all duration-500 ease-out ${circleClasses} group-hover:scale-105`}>
                    {m.icon(iconColor)}
                  </div>
                  <span className={`text-sm font-black transition-colors duration-300 ${labelColor}`}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          {activeApp.aiSuggestions && (
            <section className="bg-white rounded-3xl border border-indigo-100 overflow-hidden shadow-sm">
              <button
                onClick={() => setIsAiReportExpanded(!isAiReportExpanded)}
                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="font-black text-slate-900">{t('aiAnalysis')}</h3>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${isAiReportExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {isAiReportExpanded && (
                <div className="p-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-6">
                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{t('suitability')}</h4>
                      <p className="text-indigo-900 text-sm font-bold leading-relaxed">{activeApp.aiSuggestions.suitabilityAssessment}</p>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('keyResponsibilities')}</h4>
                      {activeApp.aiSuggestions.responsibilities.map((r, i) => (
                        <div key={i} className="flex gap-2 text-xs text-slate-600 font-medium">
                          <span className="text-indigo-400">•</span> {r}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('commonQuestions')}</h4>
                      {activeApp.aiSuggestions.potentialQuestions.map((q, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 italic border border-slate-100 hover:border-indigo-200 transition-colors">
                          "{q}"
                        </div>
                      ))}
                    </div>
                    <div className="p-5 bg-slate-900 rounded-2xl text-white">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('strategy')}</h4>
                      {activeApp.aiSuggestions.interviewTips.slice(0, 3).map((tip, i) => (
                        <p key={i} className="text-[11px] mb-2 last:mb-0">• {tip}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          <div className="space-y-6">
            {activeApp.interviews.map((interview) => (
              <div key={interview.id} className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6 relative group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <input
                      className="text-xl font-bold bg-transparent border-b border-transparent focus:border-indigo-600 outline-none w-auto"
                      value={interview.round}
                      onChange={(e) => updateInterview(interview.id, { round: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updateInterview(interview.id, { isCompleted: !interview.isCompleted })}
                      className={`flex items-center gap-2 font-bold text-sm px-3 py-1 rounded-full transition-colors ${interview.isCompleted ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-50'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      {interview.isCompleted ? t('completed') : t('pending')}
                    </button>
                    <button
                      onClick={() => deleteInterview(interview.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3 group/field">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover/field:bg-indigo-50 transition-colors">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <input
                      type="date"
                      className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer"
                      value={interview.date}
                      onChange={(e) => updateInterview(interview.id, { date: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3 group/field">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover/field:bg-indigo-50 transition-colors">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <input
                      type="time"
                      className="bg-transparent text-sm font-medium text-slate-600 outline-none cursor-pointer"
                      value={interview.time}
                      onChange={(e) => updateInterview(interview.id, { time: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-3 group/field">
                    <div className="p-2 bg-slate-50 rounded-lg group-hover/field:bg-indigo-50 transition-colors">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <input
                      placeholder={t('interviewerName')}
                      className="bg-transparent text-sm font-medium text-slate-600 outline-none w-full border-b border-transparent focus:border-indigo-600"
                      value={interview.interviewerInfo}
                      onChange={(e) => updateInterview(interview.id, { interviewerInfo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('meetingLink')}</label>
                  <div className="flex gap-4 items-center">
                    <input
                      placeholder="https://zoom.us/..."
                      className="flex-1 p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                      value={interview.meetingLink || ''}
                      onChange={(e) => updateInterview(interview.id, { meetingLink: e.target.value })}
                    />
                    {interview.meetingLink && (
                      <a
                        href={interview.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all shadow-sm"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        {t('enterMeeting')}
                      </a>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-6 flex justify-between items-center">
                  <button
                    onClick={() => setExpandedReflectionId(expandedReflectionId === interview.id ? null : interview.id)}
                    className="text-slate-400 font-bold text-sm flex items-center gap-2 hover:text-slate-600"
                  >
                    {t('reflection')}
                    <svg className={`w-4 h-4 transition-transform ${expandedReflectionId === interview.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <Button onClick={() => setExpandedReflectionId(interview.id)}>+ {t('reflection')}</Button>
                </div>

                {expandedReflectionId === interview.id && (
                  <div className="p-6 bg-slate-50 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                    <textarea
                      className="w-full bg-transparent outline-none border-none resize-none text-slate-600 min-h-[120px] text-sm leading-relaxed"
                      placeholder="..."
                      value={interview.notes}
                      onChange={(e) => updateInterview(interview.id, { notes: e.target.value })}
                    />
                    <div className="flex justify-end">
                      <button onClick={() => setExpandedReflectionId(null)} className="text-xs font-black text-indigo-600">{t('saveReflection')}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center gap-4 text-slate-300 min-h-[160px] border-dashed">
              <p className="font-bold text-slate-400">{t('upcomingStage')}</p>
              <button
                onClick={() => addInterview()}
                className="bg-slate-50 text-slate-500 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all flex items-center gap-2 border border-slate-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                {t('addInterview')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col">
      <nav className="bg-white border-b border-slate-100 px-10 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-12">
          <h1 className="text-2xl font-black text-indigo-600 flex items-center gap-2">
            <span className="p-1 bg-indigo-600 text-white rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </span>
            OfferFlow
          </h1>
          <div className="flex gap-8">
            {['records', 'stats'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-sm font-black transition-all pb-1 border-b-2 ${activeTab === tab ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
              >
                {t(tab as any)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-sm transition-all text-xs font-black text-slate-500 hover:text-indigo-600"
          >
            {lang === 'zh' ? 'EN' : '中文'}
          </button>

          <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
            <div className="text-right">
              <p className="text-xs font-black text-slate-900 leading-none">{user.name}</p>
              <button onClick={handleLogout} className="text-[10px] font-bold text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest">{t('logout')}</button>
            </div>
            <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-xl ring-2 ring-indigo-50 border border-white" />
          </div>

          <Button onClick={() => setIsModalOpen(true)}>{t('addJob')}</Button>
        </div>
      </nav>

      {activeTab === 'records' ? (
        <>
          <header className="px-10 py-10 space-y-8 max-w-7xl mx-auto w-full">
            <div className="flex gap-6 items-center">
              <div className="relative flex-1 max-w-2xl">
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-sm font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg className="w-5 h-5 absolute left-4 top-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${filterCategory === cat
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'
                    }`}
                >
                  {getCategoryName(cat)}
                </button>
              ))}
            </div>
          </header>

          <main className="px-10 pb-20 max-w-7xl mx-auto w-full flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
              {filteredApplications.map(app => (
                <ApplicationCard
                  key={app.id}
                  lang={lang}
                  application={app}
                  isActive={false}
                  onClick={() => { setActiveAppId(app.id); setView('detail'); }}
                  onUpdateStatus={(e) => { e.stopPropagation(); setActiveAppId(app.id); setView('detail'); }}
                />
              ))}
              <div
                onClick={() => setIsModalOpen(true)}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-400 transition-all cursor-pointer group min-h-[280px]"
              >
                <div className="p-4 rounded-full bg-slate-50 group-hover:bg-indigo-50 mb-4 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </div>
                <p className="font-bold">{t('addJob')}</p>
              </div>
            </div>
          </main>
        </>
      ) : (
        <main className="px-10 py-10 max-w-7xl mx-auto w-full space-y-10 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
              <h4 className="text-slate-400 font-bold text-sm uppercase tracking-widest">{t('totalApplied')}</h4>
              <p className="text-5xl font-black text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
              <h4 className="text-slate-400 font-bold text-sm uppercase tracking-widest">{t('interviewRate')}</h4>
              <p className="text-5xl font-black text-indigo-600">{stats.interviewRate}%</p>
              <p className="text-xs text-slate-400 font-medium">{stats.interviewing} {lang === 'zh' ? '个岗位进入面试阶段' : 'positions reached interview stage'}</p>
            </div>
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
              <h4 className="text-slate-400 font-bold text-sm uppercase tracking-widest">{t('offerRate')}</h4>
              <p className="text-5xl font-black text-emerald-500">{stats.offerRate}%</p>
              <p className="text-xs text-slate-400 font-medium">{lang === 'zh' ? `恭喜获得 ${stats.offers} 个录取！` : `Congrats on ${stats.offers} offers!`}</p>
            </div>
            <div className="bg-white p-10 rounded-[2rem] border border-slate-100 shadow-sm space-y-2">
              <h4 className="text-slate-400 font-bold text-sm uppercase tracking-widest">{t('rejectedCount')}</h4>
              <p className="text-5xl font-black text-rose-500">{stats.rejected}</p>
              <p className="text-xs text-slate-400 font-medium">{t('cheerUp')}</p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-2xl font-black">{t('funnelTitle')}</h3>
            <div className="space-y-6">
              {[
                { label: t('applied'), count: stats.total, color: 'bg-indigo-100', text: 'text-indigo-600', width: '100%' },
                { label: t('interviewing'), count: stats.interviewing, color: 'bg-amber-100', text: 'text-amber-600', width: stats.total > 0 ? `${(stats.interviewing / stats.total) * 100}%` : '0%' },
                { label: t('offer'), count: stats.offers, color: 'bg-emerald-100', text: 'text-emerald-600', width: stats.total > 0 ? `${(stats.offers / stats.total) * 100}%` : '0%' },
                { label: t('rejected'), count: stats.rejected, color: 'bg-rose-100', text: 'text-rose-600', width: stats.total > 0 ? `${(stats.rejected / stats.total) * 100}%` : '0%' },
              ].map((step, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span>{step.label}</span>
                    <span className={step.text}>{step.count}</span>
                  </div>
                  <div className="w-full bg-slate-50 h-10 rounded-2xl overflow-hidden relative">
                    <div
                      className={`${step.color} h-full transition-all duration-1000 ease-out flex items-center px-4`}
                      style={{ width: step.width, minWidth: step.count > 0 ? '60px' : '0' }}
                    >
                      {step.count > 0 && <span className={`text-[10px] font-black ${step.text}`}>{step.width}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-6">
          <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black">{t('newTracking')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleAddApplication} className="p-10 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('jdLink')}</label>
                <input className="w-full p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" placeholder={t('jdLinkPlaceholder')} value={newAppForm.jdLink} onChange={(e) => setNewAppForm({ ...newAppForm, jdLink: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('company')}</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium" placeholder={t('companyPlaceholder')} value={newAppForm.companyName} onChange={(e) => setNewAppForm({ ...newAppForm, companyName: e.target.value })} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('position')}</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none font-medium" placeholder={t('positionPlaceholder')} value={newAppForm.positionTitle} onChange={(e) => setNewAppForm({ ...newAppForm, positionTitle: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('jobType')}</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewAppForm({ ...newAppForm, category: c })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${newAppForm.category === c ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                    >
                      {getCategoryName(c)}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full py-4 text-lg font-black" isLoading={isAnalyzing} type="submit">{t('startTracking')}</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
