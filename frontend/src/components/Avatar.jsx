export default function Avatar({ user, size = 40 }) {
  const initials = (user?.display_name || user?.username || '?').slice(0, 2).toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {user?.avatar
        ? <img src={user.avatar} alt={user?.display_name || ''} loading="lazy" />
        : initials}
    </div>
  );
}
