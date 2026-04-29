"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, ShieldCheck, Lock, Upload, Eye, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { showSuccess, showError } from '@/utils/toast';
import { generateBlindTeaser } from '@/utils/teaserGenerator';
import { useTranslation } from 'react-i18next';

interface DataRoomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
  user: any;
}

export function DataRoomPanel({ isOpen, onClose, listing, user }: DataRoomPanelProps) {
  useScrollLock(isOpen);
  const [ndaStatus, setNdaStatus] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [buyersWithNda, setBuyersWithNda] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{url: string, name: string} | null>(null);
  const { t, i18n } = useTranslation();

  const isOwner = user && listing?.owner_id === user.id;

  useEffect(() => {
    if (isOpen && user && listing) {
      fetchData();
    }
  }, [isOpen, user, listing]);

  const fetchData = async () => {
    setLoading(true);
    if (!isOwner) {
      // Check NDA status for buyer
      const { data: nda } = await supabase
        .from('ndas')
        .select('status')
        .eq('listing_id', listing.id)
        .eq('buyer_id', user.id)
        .maybeSingle();
      
      setNdaStatus(nda?.status || null);

      if (nda?.status === 'signed') {
        const { data: docs } = await supabase
          .from('vdr_documents')
          .select('*')
          .eq('listing_id', listing.id);
        setDocuments(docs || []);
      }
    } else {
      // Owner fetches all docs and NDAs
      const { data: docs } = await supabase
        .from('vdr_documents')
        .select('*')
        .eq('listing_id', listing.id);
      setDocuments(docs || []);

      const { data: ndas } = await supabase
        .from('ndas')
        .select('*, buyer:buyer_id(id, email, raw_user_meta_data)')
        .eq('listing_id', listing.id)
        .eq('status', 'signed');
      setBuyersWithNda(ndas || []);
    }
    setLoading(false);
  };

  const signNda = async () => {
    try {
      const { error } = await supabase.from('ndas').upsert({
        listing_id: listing.id,
        buyer_id: user.id,
        status: 'signed',
        signed_at: new Date().toISOString(),
      }, { onConflict: 'listing_id,buyer_id' });

      if (error) throw error;
      showSuccess(t('vdr.toast_nda_signed'));
      fetchData();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${listing.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('vdr')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('vdr_documents').insert({
        listing_id: listing.id,
        name: file.name,
        file_path: filePath,
        size_bytes: file.size
      });

      if (dbError) throw dbError;

      showSuccess(t('vdr.toast_doc_added'));
      fetchData();
    } catch (err: any) {
      showError(`${t('vdr.toast_upload_error')}${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('vdr').createSignedUrl(doc.file_path, 60, {
        download: doc.name
      });
      if (error) throw error;
      
      // Log access
      if (!isOwner) {
        await supabase.from('vdr_access_logs').insert({
          document_id: doc.id,
          viewer_id: user.id
        });
      }

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      showError(t('vdr.toast_access_error'));
    }
  };

  const viewDocument = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage.from('vdr').createSignedUrl(doc.file_path, 300); // 5 min expiry
      if (error) throw error;
      
      if (!isOwner) {
        await supabase.from('vdr_access_logs').insert({
          document_id: doc.id,
          viewer_id: user.id
        });
      }

      setPreviewDoc({ url: data.signedUrl, name: doc.name });
    } catch (err: any) {
      showError(t('vdr.toast_access_error'));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#2b2a2f] border-l border-white/10 z-[210] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <h2 className="text-xl font-light text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {t('vdr.title')}
              </h2>
              <button onClick={onClose} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-white/50">{t('vdr.loading')}</div>
              ) : isOwner ? (
                <div className="space-y-8">
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-2">
                    <p className="text-sm text-white font-medium mb-1.5 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      {t('vdr.why_title')}
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed">
                      {t('vdr.why_desc1')}
                      <br className="mb-1" />
                      {t('vdr.why_desc2')}
                    </p>
                  </div>

                  <button onClick={() => generateBlindTeaser(listing, t, i18n.language)} className="w-full py-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium hover:bg-primary/20 transition-all flex items-center justify-center gap-2 shadow-lg">
                    <FileText className="w-4 h-4" />
                    {t('vdr.generate_teaser_owner')}
                  </button>

                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4 font-medium">{t('vdr.manage_docs')}</h3>
                    {documents.length === 0 ? (
                      <div className="text-sm text-white/50 border border-white/10 border-dashed rounded-xl p-8 text-center bg-white/5">
                        {t('vdr.no_docs_owner')}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="w-5 h-5 text-white/60 shrink-0" />
                              <div className="truncate">
                                <p className="text-sm text-white truncate">{doc.name}</p>
                                <p className="text-xs text-white/40">{(doc.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => viewDocument(doc)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.view')}>
                                <Eye size={16} />
                              </button>
                              <button onClick={() => downloadDocument(doc)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.download')}>
                                <Download size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-4 relative">
                      <input type="file" onChange={uploadDocument} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploading} />
                      <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer text-sm font-medium">
                        <Upload size={18} />
                        {uploading ? t('vdr.uploading') : t('vdr.upload')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4 font-medium">{t('vdr.authorized_access')}</h3>
                    {buyersWithNda.length === 0 ? (
                      <p className="text-sm text-white/40 italic">{t('vdr.no_nda_signed')}</p>
                    ) : (
                      <div className="space-y-3">
                        {buyersWithNda.map((nda) => (
                          <div key={nda.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white">
                              {nda.buyer?.raw_user_meta_data?.full_name?.[0] || '?'}
                            </div>
                            <div className="flex-1 truncate">
                              <p className="text-sm text-white truncate">{nda.buyer?.raw_user_meta_data?.full_name || t('vdr.unknown_user')}</p>
                              <p className="text-xs text-primary flex items-center gap-1"><CheckCircle2 size={12}/> {t('vdr.signed_on')} {new Date(nda.signed_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : ndaStatus !== 'signed' ? (
                <div className="flex flex-col items-center justify-center text-center mt-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <Lock className="w-8 h-8 text-white/60" />
                  </div>
                  <h3 className="text-xl font-light text-white mb-2">{t('vdr.confidential_space')}</h3>
                  <p className="text-sm text-white/50 mb-8 max-w-sm">
                    {t('vdr.nda_required')}
                  </p>
                  
                  <div className="w-full text-left bg-white/5 border border-white/10 rounded-xl p-5 mb-8 h-48 overflow-y-auto text-xs text-white/60 leading-relaxed custom-scrollbar">
                    <strong className="text-white block mb-2">{t('vdr.nda_title')}</strong>
                    {t('vdr.nda_text_1')} 
                    <br/><br/>
                    {t('vdr.nda_text_2')}<br/>
                    {t('vdr.nda_text_3')}<br/>
                    {t('vdr.nda_text_4')}<br/>
                    {t('vdr.nda_text_5')}<br/>
                    {t('vdr.nda_text_6')}
                    <br/><br/>
                    {t('vdr.nda_text_7')}
                  </div>

                  <button onClick={signNda} className="w-full py-4 rounded-xl bg-white text-black font-medium hover:bg-white/90 transition-all shadow-lg hover:scale-[1.02]">
                    {t('vdr.sign_nda')}
                  </button>

                  <div className="w-full h-px bg-white/10 my-8 relative">
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-[#2b2a2f] px-3 text-xs text-white/40 uppercase tracking-widest">{t('vdr.or')}</span>
                  </div>

                  <p className="text-xs text-white/40 mb-4 px-4 leading-relaxed">
                    {t('vdr.teaser_prompt')}
                  </p>
                  
                  <button onClick={() => generateBlindTeaser(listing, t, i18n.language)} className="w-full py-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium hover:bg-primary/20 transition-all flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('vdr.generate_teaser_buyer')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                    <div>
                      <p className="text-sm text-white font-medium">{t('vdr.access_authorized')}</p>
                      <p className="text-xs text-primary">{t('vdr.nda_signed_traced')}</p>
                    </div>
                  </div>

                  <button onClick={() => generateBlindTeaser(listing, t, i18n.language)} className="w-full py-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-medium hover:bg-primary/20 transition-all flex items-center justify-center gap-2 shadow-lg">
                    <FileText className="w-4 h-4" />
                    {t('vdr.generate_teaser_buyer')}
                  </button>

                  <div>
                    <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4 font-medium">{t('vdr.available_docs')}</h3>
                    {documents.length === 0 ? (
                      <p className="text-sm text-white/50 border border-white/10 border-dashed rounded-xl p-6 text-center">
                        {t('vdr.no_docs_buyer')}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="w-5 h-5 text-primary shrink-0" />
                              <div className="truncate">
                                <p className="text-sm text-white truncate">{doc.name}</p>
                                <p className="text-xs text-white/40">{(doc.size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => viewDocument(doc)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.view')}>
                                <Eye size={16} />
                              </button>
                              <button onClick={() => downloadDocument(doc)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors" title={t('vdr.download')}>
                                <Download size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#2b2a2f]">
            <h3 className="text-white font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {previewDoc.name}
            </h3>
            <button onClick={() => setPreviewDoc(null)} className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 w-full h-full relative p-4 sm:p-8">
            <iframe 
              src={previewDoc.url} 
              className="w-full h-full border border-white/10 bg-white rounded-xl shadow-2xl"
              title={previewDoc.name}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
