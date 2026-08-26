"use client";

interface UserAvatarProps {
  initials: string;
  title?: string;
}

export function UserAvatar({ initials, title }: UserAvatarProps) {
  return (
    <span className="user-avatar" title={title} aria-hidden={!title}>
      {initials}
    </span>
  );
}
