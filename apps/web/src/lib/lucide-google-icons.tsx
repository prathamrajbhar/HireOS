import React from 'react';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}

const sizeMap: Record<string, string> = {
  'h-3': '12px', 'w-3': '12px',
  'h-3.5': '14px', 'w-3.5': '14px',
  'h-4': '16px', 'w-4': '16px',
  'h-5': '20px', 'w-5': '20px',
  'h-6': '24px', 'w-6': '24px',
  'h-8': '32px', 'w-8': '32px',
  'h-10': '40px', 'w-10': '40px',
  'h-12': '48px', 'w-12': '48px',
};

const createMaterialIcon = (iconName: string) => {
  const Component = React.forwardRef<HTMLSpanElement, IconProps>(
    ({ size, className = '', strokeWidth, ...props }, ref) => {
      let fontSize = size ? (typeof size === 'number' ? `${size}px` : size) : undefined;
      
      if (!fontSize) {
        const classes = className.split(' ');
        for (const cls of classes) {
          if (sizeMap[cls]) {
            fontSize = sizeMap[cls];
            break;
          }
        }
      }

      // Default fallback size if no size class matches
      if (!fontSize) {
        fontSize = '20px';
      }

      return (
        <span
          ref={ref}
          className={`material-symbols-outlined select-none align-middle ${className}`}
          style={{
            fontSize,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            width: fontSize,
            height: fontSize,
          }}
          {...props}
        >
          {iconName}
        </span>
      );
    }
  );
  Component.displayName = iconName;
  return Component;
};

// Map of Lucide Icon -> Google Material Symbol Outlined name
export const Activity = createMaterialIcon('monitoring');
export const AlertCircle = createMaterialIcon('info');
export const AlertTriangle = createMaterialIcon('warning');
export const ArrowLeft = createMaterialIcon('arrow_back');
export const ArrowLeftRight = createMaterialIcon('swap_horiz');
export const ArrowRight = createMaterialIcon('arrow_forward');
export const Award = createMaterialIcon('workspace_premium');
export const BarChart3 = createMaterialIcon('bar_chart');
export const Bell = createMaterialIcon('notifications');
export const BookOpen = createMaterialIcon('menu_book');
export const Brain = createMaterialIcon('psychology');
export const Briefcase = createMaterialIcon('work');
export const Building = createMaterialIcon('business');
export const Building2 = createMaterialIcon('corporate_fare');
export const Calendar = createMaterialIcon('calendar_today');
export const Check = createMaterialIcon('check');
export const CheckCircle2 = createMaterialIcon('check_circle');
export const ChevronDown = createMaterialIcon('keyboard_arrow_down');
export const ChevronRight = createMaterialIcon('chevron_right');
export const ChevronUp = createMaterialIcon('keyboard_arrow_up');
export const CircleDot = createMaterialIcon('radio_button_checked');
export const Clock = createMaterialIcon('schedule');
export const Code = createMaterialIcon('code');
export const Compass = createMaterialIcon('explore');
export const Cpu = createMaterialIcon('memory');
export const CreditCard = createMaterialIcon('credit_card');
export const DollarSign = createMaterialIcon('attach_money');
export const Download = createMaterialIcon('download');
export const FileCheck = createMaterialIcon('fact_check');
export const FileText = createMaterialIcon('description');
export const FileUp = createMaterialIcon('upload_file');
export const Filter = createMaterialIcon('filter_list');
export const Globe = createMaterialIcon('public');
export const HelpCircle = createMaterialIcon('help');
export const Layers = createMaterialIcon('layers');
export const LayoutDashboard = createMaterialIcon('dashboard');
export const Library = createMaterialIcon('local_library');
export const Link = createMaterialIcon('link');
export const Link2 = createMaterialIcon('link');
export const Lock = createMaterialIcon('lock');
export const LogIn = createMaterialIcon('login');
export const LogOut = createMaterialIcon('logout');
export const Mail = createMaterialIcon('mail');
export const MapPin = createMaterialIcon('location_on');
export const Menu = createMaterialIcon('menu');
export const MessageSquare = createMaterialIcon('chat');
export const Mic = createMaterialIcon('mic');
export const MicOff = createMaterialIcon('mic_off');
export const Pause = createMaterialIcon('pause');
export const PhoneOff = createMaterialIcon('phone_disabled');
export const Play = createMaterialIcon('play_arrow');
export const Plus = createMaterialIcon('add');
export const Scale = createMaterialIcon('balance');
export const ScrollText = createMaterialIcon('receipt_long');
export const Search = createMaterialIcon('search');
export const Send = createMaterialIcon('send');
export const Server = createMaterialIcon('dns');
export const Settings = createMaterialIcon('settings');
export const Shield = createMaterialIcon('shield');
export const ShieldAlert = createMaterialIcon('gpp_bad');
export const ShieldCheck = createMaterialIcon('verified_user');
export const Sliders = createMaterialIcon('tune');
export const Sparkles = createMaterialIcon('auto_awesome');
export const Star = createMaterialIcon('star');
export const Target = createMaterialIcon('track_changes');
export const Terminal = createMaterialIcon('terminal');
export const Trash2 = createMaterialIcon('delete');
export const TrendingUp = createMaterialIcon('trending_up');
export const Trophy = createMaterialIcon('emoji_events');
export const UploadCloud = createMaterialIcon('cloud_upload');
export const User = createMaterialIcon('person');
export const UserPlus = createMaterialIcon('person_add');
export const Users = createMaterialIcon('group');
export const Users2 = createMaterialIcon('groups');
export const Video = createMaterialIcon('videocam');
export const VideoOff = createMaterialIcon('videocam_off');
export const Volume2 = createMaterialIcon('volume_up');
export const X = createMaterialIcon('close');
export const Bold = createMaterialIcon('format_bold');
export const Italic = createMaterialIcon('format_italic');
export const List = createMaterialIcon('format_list_bulleted');
export const Heading = createMaterialIcon('title');
export const Heart = createMaterialIcon('favorite');
export const AudioLines = createMaterialIcon('graphic_eq');

