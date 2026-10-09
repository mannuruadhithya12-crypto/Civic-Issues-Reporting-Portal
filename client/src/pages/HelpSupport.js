import React, { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function HelpSupport() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const faqRef = useRef(null);

  // FAQs State
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Contact Info State
  const [contactInfo, setContactInfo] = useState({ isConfigured: false });

  // User's Reported Issues (for ticket dropdown)
  const [userIssues, setUserIssues] = useState([]);

  // User's Support Tickets State
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTab, setActiveTab] = useState('faqs'); // 'faqs' | 'tickets'

  // Modals State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'TECHNICAL',
    description: '',
    priority: 'normal',
    relatedIssueId: ''
  });
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);
  const [ticketError, setTicketError] = useState('');

  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState(1);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchFaqs();
    fetchContactInfo();
    if (user) {
      fetchUserIssues();
      fetchMyTickets();
    }
  }, [user, selectedCategory]);

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFaqs = async () => {
    setLoadingFaqs(true);
    try {
      let url = `/support/faqs?category=${encodeURIComponent(selectedCategory)}`;
      if (faqSearch.trim()) {
        url += `&search=${encodeURIComponent(faqSearch.trim())}`;
      }
      const res = await api.get(url);
      if (res.data && res.data.faqs) {
        setFaqs(res.data.faqs);
      }
    } catch (err) {
      console.error('Failed to fetch FAQs:', err);
    } finally {
      setLoadingFaqs(false);
    }
  };

  const fetchContactInfo = async () => {
    try {
      const res = await api.get('/support/contact-info');
      if (res.data) {
        setContactInfo(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch contact info:', err);
    }
  };

  const fetchUserIssues = async () => {
    try {
      const res = await api.get('/issues?myIssues=true');
      if (Array.isArray(res.data)) {
        setUserIssues(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch user issues:', err);
    }
  };

  const fetchMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get('/support/tickets');
      if (res.data && res.data.tickets) {
        setMyTickets(res.data.tickets);
      }
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Filter FAQs locally for immediate responsiveness
  const filteredFaqs = faqs.filter(faq => {
    if (!faqSearch.trim()) return true;
    const q = faqSearch.toLowerCase();
    return (
      faq.question.toLowerCase().includes(q) ||
      faq.answer.toLowerCase().includes(q) ||
      faq.category.toLowerCase().includes(q)
    );
  });

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Submit Support Ticket
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setTicketError('');

    if (!ticketForm.subject.trim()) {
      setTicketError('Subject is required.');
      return;
    }
    if (!ticketForm.description.trim()) {
      setTicketError('Description is required.');
      return;
    }

    setTicketSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', ticketForm.subject.trim());
      formData.append('category', ticketForm.category);
      formData.append('description', ticketForm.description.trim());
      formData.append('priority', ticketForm.priority);
      if (ticketForm.relatedIssueId) {
        formData.append('relatedIssueId', ticketForm.relatedIssueId);
      }
      ticketAttachments.forEach(file => {
        formData.append('attachments', file);
      });

      const res = await api.post('/support/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.ticket) {
        setTicketSuccess(res.data.ticket);
        showToast('success', `Support ticket ${res.data.ticket.ticketNumber} submitted.`);
        fetchMyTickets();
      }
    } catch (err) {
      console.error(err);
      setTicketError(err.response?.data?.message || 'Failed to submit support ticket.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Reply to Support Ticket
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setReplySubmitting(true);
    try {
      const res = await api.post(`/support/tickets/${selectedTicket._id}/reply`, { text: replyText.trim() });
      if (res.data && res.data.ticket) {
        setSelectedTicket(res.data.ticket);
        setReplyText('');
        showToast('success', 'Reply submitted.');
        fetchMyTickets();
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to send reply.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const categories = ['All', 'Reporting', 'Tracking', 'Account', 'Notifications', 'Privacy'];

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'open': return { bg: '#dbeafe', color: '#1e40af', label: 'Open' };
      case 'in_progress': return { bg: '#ffedd5', color: '#c2410c', label: 'In Progress' };
      case 'waiting_for_user': return { bg: '#fef3c7', color: '#b45309', label: 'Waiting for You' };
      case 'resolved': return { bg: '#dcfce7', color: '#15803d', label: 'Resolved' };
      case 'closed': return { bg: '#f1f5f9', color: '#475569', label: 'Closed' };
      default: return { bg: '#f1f5f9', color: '#475569', label: status };
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '40px auto', maxWidth: '500px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '12px' }}>Log in to access Help & Support</h2>
        <button onClick={() => navigate('/login')} className="cit-btn cit-btn-primary">Go to Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '12px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>Help & Support</h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Find answers to your questions or get in touch with our support team.</p>
      </div>

      {/* ================= 4 TOP SUPPORT CARDS ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        
        {/* CARD 1: FAQs */}
        <div 
          onClick={() => {
            setActiveTab('faqs');
            faqRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>FAQs</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.3' }}>Find quick answers to common questions</p>
            </div>
          </div>
          <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>

        {/* CARD 2: Contact Support */}
        <div 
          onClick={() => {
            setTicketSuccess(null);
            setTicketForm({ subject: '', category: 'TECHNICAL', description: '', priority: 'normal', relatedIssueId: '' });
            setTicketAttachments([]);
            setShowSupportModal(true);
          }}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>Contact Support</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.3' }}>Get help from our support team</p>
            </div>
          </div>
          <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>

        {/* CARD 3: User Guide */}
        <div 
          onClick={() => setShowUserGuideModal(true)}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>User Guide</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.3' }}>Learn how to use CivicConnect</p>
            </div>
          </div>
          <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>

        {/* CARD 4: Report a Problem */}
        <div 
          onClick={() => {
            setTicketSuccess(null);
            setTicketForm({ subject: '', category: 'TECHNICAL', description: '', priority: 'high', relatedIssueId: '' });
            setTicketAttachments([]);
            setShowSupportModal(true);
          }}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M22 12A10 10 0 0 0 12 2v20a10 10 0 0 0 10-10z" />
                <path d="M12 2a10 10 0 0 0-10 10h10" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>Report a Problem</h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.3' }}>Let us know if you're facing an issue</p>
            </div>
          </div>
          <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
        </div>

      </div>

      {/* ================= MAIN CONTENT SPLIT GRID ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '24px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: FAQ OR MY TICKETS */}
        <div ref={faqRef} style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          
          {/* TAB HEADER SWITCHER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', pb: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
                {activeTab === 'faqs' ? 'Frequently Asked Questions' : 'My Support Tickets'}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                {activeTab === 'faqs' ? 'Find answers to the most common questions about CivicConnect.' : 'Track and reply to your open support requests.'}
              </p>
            </div>

            <button 
              onClick={() => setActiveTab(activeTab === 'faqs' ? 'tickets' : 'faqs')}
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: '#2563eb',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {activeTab === 'faqs' ? `My Tickets (${myTickets.length}) →` : '← View All FAQs'}
            </button>
          </div>

          {/* ================= FAQS TAB ================= */}
          {activeTab === 'faqs' && (
            <div>
              {/* SEARCH & CATEGORY FILTERS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input 
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search FAQs by keyword or topic..."
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', pb: '4px' }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '99px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: selectedCategory === cat ? 'none' : '1px solid #e2e8f0',
                        background: selectedCategory === cat ? '#2563eb' : '#f8fafc',
                        color: selectedCategory === cat ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ ACCORDION LIST */}
              {loadingFaqs ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading FAQs...</div>
              ) : filteredFaqs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px border-dashed #cbd5e1' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No FAQs found</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Try searching with a different term or clear filters.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredFaqs.map((faq, index) => {
                    const isOpen = expandedFaq === index;
                    return (
                      <div 
                        key={faq._id || index} 
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#ffffff',
                          transition: 'all 0.2s'
                        }}
                      >
                        <button
                          onClick={() => toggleFaq(index)}
                          style={{
                            width: '100%',
                            padding: '16px 20px',
                            background: isOpen ? '#f8fafc' : '#ffffff',
                            border: 'none',
                            textAlign: 'left',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', paddingRight: '12px' }}>
                            {faq.question}
                          </span>
                          <svg 
                            width="16" 
                            height="16" 
                            fill="none" 
                            stroke="#64748b" 
                            viewBox="0 0 24 24" 
                            strokeWidth="2.5"
                            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>

                        {isOpen && (
                          <div style={{ padding: '0 20px 16px 20px', fontSize: '13px', color: '#475569', lineHeight: '1.6', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                            <p style={{ margin: '12px 0 0 0' }}>{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================= MY TICKETS TAB ================= */}
          {activeTab === 'tickets' && (
            <div>
              {loadingTickets ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Loading support tickets...</div>
              ) : myTickets.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎫</div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No support requests yet</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>If you need help, click Contact Support to create a ticket.</div>
                  <button 
                    onClick={() => {
                      setTicketSuccess(null);
                      setTicketForm({ subject: '', category: 'TECHNICAL', description: '', priority: 'normal', relatedIssueId: '' });
                      setShowSupportModal(true);
                    }}
                    className="cit-btn cit-btn-primary"
                  >
                    Create Support Ticket
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myTickets.map(ticket => {
                    const st = getStatusBadgeStyle(ticket.status);
                    return (
                      <div 
                        key={ticket._id}
                        onClick={() => setSelectedTicket(ticket)}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px',
                          background: '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>{ticket.ticketNumber}</span>
                            <span style={{ background: st.bg, color: st.color, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>
                              {st.label}
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '2px' }}>{ticket.subject}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            Category: {ticket.category} • Created: {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <svg width="18" height="18" fill="none" stroke="#94a3b8" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: CONTACT SUPPORT PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* CONTACT SUPPORT DETAILS CARD */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Contact Support</h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px 0' }}>Need more help? Reach out to our support team.</p>

            {contactInfo && contactInfo.isConfigured ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {contactInfo.email && (
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Email Support</div>
                      <a href={`mailto:${contactInfo.email}`} style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', textDecoration: 'none' }}>
                        {contactInfo.email}
                      </a>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{contactInfo.responseTimeText}</div>
                    </div>
                  </div>
                )}

                {contactInfo.phone && (
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Call Us</div>
                      <a href={`tel:${contactInfo.phone}`} style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', textDecoration: 'none' }}>
                        {contactInfo.phone}
                      </a>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{contactInfo.phoneHours}</div>
                    </div>
                  </div>
                )}

                {contactInfo.address && (
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Visit Us</div>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', lineHeight: '1.4' }}>{contactInfo.address}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{contactInfo.addressHours}</div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5', padding: '8px 0' }}>
                Support contact information is currently unavailable.
              </div>
            )}
          </div>

          {/* STILL NEED HELP CARD */}
          <div style={{ background: '#eff6ff', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #dbeafe' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center', marginBottom: '12px', color: '#2563eb' }}>
              <span>→</span>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span>←</span>
            </div>

            <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Still need help?</h4>
            <p style={{ fontSize: '12px', color: '#475569', margin: '0 0 18px 0', lineHeight: '1.4' }}>
              Our support team is here to assist you with any questions or concerns.
            </p>

            <button
              onClick={() => {
                setTicketSuccess(null);
                setTicketForm({ subject: '', category: 'TECHNICAL', description: '', priority: 'normal', relatedIssueId: '' });
                setShowSupportModal(true);
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Contact Support →
            </button>
          </div>

        </div>

      </div>

      {/* ================= MODAL 1: CONTACT SUPPORT / SUBMIT TICKET ================= */}
      {showSupportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {ticketSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', fontSize: '28px' }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Support Ticket Created!</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Your ticket has been submitted to our support team.</p>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ticket Number</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>{ticketSuccess.ticketNumber}</div>
                </div>

                <button 
                  onClick={() => setShowSupportModal(false)} 
                  className="cit-btn cit-btn-primary" 
                  style={{ width: '100%' }}
                >
                  Close & View Tickets
                </button>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Contact Support</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0' }}>Submit a ticket to get help from municipal support staff.</p>

                {ticketError && (
                  <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
                    {ticketError}
                  </div>
                )}

                <form onSubmit={handleSubmitTicket}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Subject *</label>
                      <input 
                        type="text" 
                        value={ticketForm.subject} 
                        onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="Brief summary of your issue"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Category *</label>
                        <select
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="ACCOUNT">Account Issue</option>
                          <option value="REPORTING">Issue Reporting</option>
                          <option value="ISSUE_TRACKING">Tracking Status</option>
                          <option value="LOCATION">Map & Location</option>
                          <option value="MEDIA_UPLOAD">Image Upload</option>
                          <option value="NOTIFICATIONS">Notifications</option>
                          <option value="TECHNICAL">Technical / Platform Bug</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Priority</label>
                        <select
                          value={ticketForm.priority}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    {userIssues.length > 0 && (
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Related Issue (Optional)</label>
                        <select
                          value={ticketForm.relatedIssueId}
                          onChange={(e) => setTicketForm(prev => ({ ...prev, relatedIssueId: e.target.value }))}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="">-- None --</option>
                          {userIssues.map(iss => (
                            <option key={iss._id} value={iss._id}>{iss.title} ({iss.status})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Description *</label>
                      <textarea
                        rows="4"
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Provide details about what you need help with..."
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                      ></textarea>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Attachment (Optional)</label>
                      <input 
                        type="file" 
                        onChange={(e) => setTicketAttachments(Array.from(e.target.files))}
                        accept="image/*,.pdf"
                        multiple
                        style={{ fontSize: '13px' }}
                      />
                    </div>

                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                    <button
                      type="button"
                      onClick={() => setShowSupportModal(false)}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {ticketSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ================= MODAL 2: USER GUIDE ================= */}
      {showUserGuideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '640px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', pb: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>CivicConnect User Guide</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>Learn how to report issues, track progress, and use citizen features.</p>
              </div>
              <button onClick={() => setShowUserGuideModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            {/* GUIDE STEP NAVIGATION */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', pb: '4px' }}>
              {[
                { id: 1, label: '1. Report an Issue' },
                { id: 2, label: '2. Track Progress' },
                { id: 3, label: '3. Map & Location' },
                { id: 4, label: '4. Notifications' },
                { id: 5, label: '5. Support & Profile' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveGuideStep(s.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '700',
                    border: activeGuideStep === s.id ? 'none' : '1px solid #e2e8f0',
                    background: activeGuideStep === s.id ? '#2563eb' : '#f8fafc',
                    color: activeGuideStep === s.id ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* GUIDE STEP CONTENT */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
              {activeGuideStep === 1 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '800' }}>How to Report a Civic Issue</h4>
                  <ol style={{ paddingLeft: '20px', margin: 0 }}>
                    <li>Click <strong>Report Issue</strong> in the left sidebar menu.</li>
                    <li>Choose a relevant category (e.g. Potholes, Water leakage, Streetlights).</li>
                    <li>Provide a detailed title and description of the problem.</li>
                    <li>Pin the exact coordinates on the interactive Leaflet map.</li>
                    <li>Attach photo evidence (up to 5 images) to help workers verify faster.</li>
                    <li>Click <strong>Submit Issue</strong> to receive your unique `#CC-2024-XXXXX` tracking ID.</li>
                  </ol>
                </div>
              )}

              {activeGuideStep === 2 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '800' }}>Tracking Issue Milestones</h4>
                  <p style={{ margin: '0 0 10px 0' }}>Every issue moves through five clear stage milestones:</p>
                  <ul style={{ paddingLeft: '20px', margin: 0 }}>
                    <li><strong>Reported:</strong> Submitted by citizen, queued for review.</li>
                    <li><strong>Under Review:</strong> Verified by AI severity detection and department dispatchers.</li>
                    <li><strong>In Progress:</strong> Assigned to a municipal field worker who has started repairs.</li>
                    <li><strong>Resolved:</strong> Maintenance completed with photo proof.</li>
                    <li><strong>Closed:</strong> Confirmed closed by citizen or system admin.</li>
                  </ul>
                </div>
              )}

              {activeGuideStep === 3 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '800' }}>Using the Interactive Map</h4>
                  <p style={{ margin: 0 }}>
                    Open the <strong>Map</strong> page to view open issues across your city. You can search by address, filter by department, or click any map marker to inspect real-time progress and photos.
                  </p>
                </div>
              )}

              {activeGuideStep === 4 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '800' }}>Notifications & Alerts</h4>
                  <p style={{ margin: 0 }}>
                    Check <strong>Notifications</strong> to view status updates, worker notes, and city announcements. You can mark all as read or adjust alert preferences under <strong>Settings</strong>.
                  </p>
                </div>
              )}

              {activeGuideStep === 5 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '800' }}>Support & Account Profile</h4>
                  <p style={{ margin: 0 }}>
                    Manage your personal details under <strong>Profile</strong>. If you encounter any technical glitch or need help, submit a ticket via <strong>Help & Support</strong>.
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setShowUserGuideModal(false)} className="cit-btn cit-btn-primary">
                Got It
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL 3: TICKET DETAILS & THREAD ================= */}
      {selectedTicket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '600px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', pb: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb' }}>{selectedTicket.ticketNumber}</span>
                  <span style={{ ...getStatusBadgeStyle(selectedTicket.status), fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '99px' }}>
                    {getStatusBadgeStyle(selectedTicket.status).label}
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{selectedTicket.subject}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            {/* TICKET DETAILS */}
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px', display: 'flex', gap: '16px' }}>
              <span>Category: <strong>{selectedTicket.category}</strong></span>
              <span>Priority: <strong style={{ textTransform: 'capitalize' }}>{selectedTicket.priority}</strong></span>
              <span>Created: <strong>{new Date(selectedTicket.createdAt).toLocaleDateString()}</strong></span>
            </div>

            {/* MESSAGES THREAD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {selectedTicket.messages && selectedTicket.messages.map((msg, i) => (
                <div 
                  key={i} 
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: msg.senderRole === 'citizen' ? '#eff6ff' : '#f8fafc',
                    border: '1px solid #e2e8f0',
                    alignSelf: msg.senderRole === 'citizen' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: msg.senderRole === 'citizen' ? '#1e40af' : '#0f172a' }}>
                      {msg.sender} ({msg.senderRole})
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: '1.4' }}>{msg.text}</p>
                </div>
              ))}
            </div>

            {/* REPLY FORM */}
            <form onSubmit={handleSendReply}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a message reply..."
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <button 
                  type="submit" 
                  disabled={replySubmitting || !replyText.trim()}
                  className="cit-btn cit-btn-primary"
                  style={{ opacity: !replyText.trim() ? 0.6 : 1 }}
                >
                  {replySubmitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default HelpSupport;
