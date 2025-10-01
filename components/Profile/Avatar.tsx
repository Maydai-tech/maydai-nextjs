'use client'


interface AvatarProps {
    firstName: string | null;
  }

export default function Avatar({ firstName }: AvatarProps) {
  const initial = firstName?.charAt(0)?.toUpperCase() || '?';
  
  return <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
    <span className="text-[#006080] font-bold text-base leading-none">
      {initial}
    </span>
  </div>
}