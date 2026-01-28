
import React from 'react';
import { JobApplication, ApplicationStatus } from '../types';

interface Props {
  application: JobApplication;
  isActive: boolean;
  lang: 'zh' | 'en';
  onClick: () => void;
  onUpdateStatus: (e: React.MouseEvent) => void;
}

const labels = {
  zh: {
    applied: '投递',
    remote: '远程/待定',
    urgent: '需要跟进',
    channel: '渠道',
    manual: '手动',
    update: '更新状态'
  },
  en: {
    applied: 'Applied',
    remote: 'Remote/TBD',
    urgent: 'Needs Follow-up',
    channel: 'Source',
    manual: 'Manual',
    update: 'Update'
  }
};

export const ApplicationCard: React.FC<Props> = ({ application, lang, onClick, onUpdateStatus }) => {
  const isUrgent = application.status === ApplicationStatus.APPLIED || application.status === ApplicationStatus.INTERVIEWING;
  const t = labels[lang];

  return (
    <div 
      onClick={onClick}
      className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative group flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          {isUrgent && (
            <div className="mt-1 text-rose-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{application.companyName}</h3>
            <p className="text-slate-500 font-medium">{application.positionTitle}</p>
          </div>
        </div>
        <button className="text-slate-300 hover:text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </button>
      </div>

      <div className="mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          application.status === ApplicationStatus.OFFER ? 'bg-emerald-50 text-emerald-600' :
          application.status === ApplicationStatus.REJECTED ? 'bg-rose-50 text-rose-600' :
          'bg-sky-50 text-sky-600'
        }`}>
          {application.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-400 font-medium mb-6">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          {t.applied}: {new Date(application.appliedDate).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: '2-digit', day: '2-digit' })}
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {application.location || t.remote}
        </div>
        {isUrgent && (
          <div className="flex items-center gap-2 text-rose-500 font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {t.urgent}
          </div>
        )}
      </div>

      <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-50">
        <span className="text-xs text-slate-400">{t.channel}: {application.channel || t.manual}</span>
        <button 
          onClick={onUpdateStatus}
          className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
        >
          {t.update}
        </button>
      </div>
    </div>
  );
};
