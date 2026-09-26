"use client";

interface UserAvatarProps {
  initials: string;
  title?: string;
  src?: string | null;
}

export function UserAvatar({ initials, title, src }: UserAvatarProps) {
  return (
    <span className="user-avatar" title={title} aria-hidden={!title}>
      {src ? <img src={src} alt="" /> : initials}
    </span>
  );
}
