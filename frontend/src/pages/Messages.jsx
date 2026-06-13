import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function MessagesList() {
  const api = useApi();
  const navigate = useNavigate();
  const [convos, setConvos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dm').then(setConvos).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="top-nav">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1, fontSize: 18, fontWeight: 800 }}>Messages</div>
        <button className="icon-btn" onClick={() => navigate('/players')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div className="page">
        {loading
          ? <div className="loading-center"><div className="spinner" /></div>
          : convos.length === 0
            ? <div className="empty-state"><div className="empty-icon">💬</div><div className="empty-title">No messages yet</div><div className="empty-body">Find players and send them an invite to start a conversation.</div><button className="btn btn-primary btn-sm" onClick={() => navigate('/players')}>Find Players</button></div>
            : convos.map(c => (
              <div key={c.partner_id} className="msg-row" onClick={() => navigate(`/messages/${c.partner_id}`)}>
                <Avatar user={c.partner} size={48} />
                <div className="msg-info">
                  <div className="msg-name">{c.partner?.display_name}</div>
                  <div className="msg-last">{c.last_message}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{timeAgo(c.last_at)}</span>
                  {c.unread > 0 && <div className="msg-unread" />}
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

export function ChatView() {
  const { userId } = useParams();
  const api = useApi();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    api.get(`/dm/${userId}`).then(msgs => {
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
    }).catch(() => {});

    api.get(`/users/search?q=`).then(users => {
      const p = users.find(u => u.id === userId);
      if (p) setPartner(p);
    }).catch(() => {});
  }, [userId]);

  const send = async e => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const optimistic = { id: Date.now(), sender_id: me.id, content: text, created_at: new Date().toISOString() };
    setMessages(m => [...m, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    try {
      const msg = await api.post(`/dm/${userId}`, { content: text });
      setMessages(m => m.map(x => x.id === optimistic.id ? msg : x));
    } catch {}
    setSending(false);
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate('/messages')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <Avatar user={partner} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{partner?.display_name || '…'}</div>
          {partner?.is_available && <div style={{ fontSize: 11, color: 'var(--green)' }}>● Available to play</div>}
        </div>
        <button className="btn btn-primary btn-xs" onClick={() => navigate(`/u/${partner?.username}`)}>Profile</button>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`bubble-row${msg.sender_id === me?.id ? ' mine' : ''}`}>
            {msg.sender_id !== me?.id && <Avatar user={partner} size={28} />}
            <div className="bubble">{msg.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input-row" onSubmit={send}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message…"
          autoFocus
        />
        <button type="submit" className="chat-send-btn" disabled={!input.trim() || sending}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
