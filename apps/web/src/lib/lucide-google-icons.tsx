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
    ({ size, className = '', ...props }, ref) => {
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
export const ArrowUpRight = createMaterialIcon('north_east');
export const Award = createMaterialIcon('workspace_premium');
export const BarChart3 = createMaterialIcon('bar_chart');
export const Bell = createMaterialIcon('notifications');
export const BookOpen = createMaterialIcon('menu_book');
export const Bot = createMaterialIcon('smart_toy');
export const Brain = createMaterialIcon('psychology');
export const Briefcase = createMaterialIcon('work');
export const Building = createMaterialIcon('business');
export const Building2 = createMaterialIcon('corporate_fare');
export const Calendar = createMaterialIcon('calendar_today');
export const Camera = createMaterialIcon('photo_camera');
export const Check = createMaterialIcon('check');
export const CheckCircle2 = createMaterialIcon('check_circle');
export const ChevronDown = createMaterialIcon('keyboard_arrow_down');
export const ChevronRight = createMaterialIcon('chevron_right');
export const ChevronUp = createMaterialIcon('keyboard_arrow_up');
export const CircleDot = createMaterialIcon('radio_button_checked');
export const ClipboardCheck = createMaterialIcon('assignment_turned_in');
export const ClipboardList = createMaterialIcon('assignment');
export const Clock = createMaterialIcon('schedule');
export const Code = createMaterialIcon('code');
export const Columns = createMaterialIcon('view_column');
export const Compass = createMaterialIcon('explore');
export const Copy = createMaterialIcon('content_copy');
export const Cpu = createMaterialIcon('memory');
export const CreditCard = createMaterialIcon('credit_card');
export const DollarSign = createMaterialIcon('attach_money');
export const Download = createMaterialIcon('download');
export const ExternalLink = createMaterialIcon('open_in_new');
export const Eye = createMaterialIcon('visibility');
export const EyeOff = createMaterialIcon('visibility_off');
export const FileCheck = createMaterialIcon('fact_check');
export const FileSignature = createMaterialIcon('signature');
export const FileText = createMaterialIcon('description');
export const FileUp = createMaterialIcon('upload_file');
export const Filter = createMaterialIcon('filter_list');
export const Flag = createMaterialIcon('flag');
export const FolderGit2 = createMaterialIcon('folder_special');
export const Gift = createMaterialIcon('redeem');
export const GitBranch = createMaterialIcon('account_tree');
export const Github = createMaterialIcon('code');
export const Globe = createMaterialIcon('public');
export const Handshake = createMaterialIcon('handshake');
export const HelpCircle = createMaterialIcon('help');
export const Home = createMaterialIcon('home');
export const Layers = createMaterialIcon('layers');
export const LayoutDashboard = createMaterialIcon('dashboard');
export const LayoutGrid = createMaterialIcon('grid_view');
export const Library = createMaterialIcon('local_library');
export const Link = createMaterialIcon('link');
export const Link2 = createMaterialIcon('link');
export const ListChecks = createMaterialIcon('checklist');
export const Lock = createMaterialIcon('lock');
export const LogIn = createMaterialIcon('login');
export const LogOut = createMaterialIcon('logout');
export const Mail = createMaterialIcon('mail');
export const MapPin = createMaterialIcon('location_on');
export const Menu = createMaterialIcon('menu');
export const MessageSquare = createMaterialIcon('chat');
export const Mic = createMaterialIcon('mic');
export const MicOff = createMaterialIcon('mic_off');
export const Monitor = createMaterialIcon('desktop_windows');
export const MoreHorizontal = createMaterialIcon('more_horiz');
export const Pause = createMaterialIcon('pause');
export const Pencil = createMaterialIcon('edit');
export const Percent = createMaterialIcon('percent');
export const PhoneOff = createMaterialIcon('phone_disabled');
export const PieChart = createMaterialIcon('pie_chart');
export const Play = createMaterialIcon('play_arrow');
export const Plus = createMaterialIcon('add');
export const Palette = createMaterialIcon('palette');
export const BellRing = createMaterialIcon('notifications_active');
export const Puzzle = createMaterialIcon('extension');
export const RefreshCw = createMaterialIcon('refresh');
export const Repeat = createMaterialIcon('repeat');
export const RotateCcw = createMaterialIcon('history');
export const Scale = createMaterialIcon('balance');
export const Save = createMaterialIcon('save');
export const ScrollText = createMaterialIcon('receipt_long');
export const Search = createMaterialIcon('search');
export const Send = createMaterialIcon('send');
export const Server = createMaterialIcon('dns');
export const Settings = createMaterialIcon('settings');
export const Shield = createMaterialIcon('shield');
export const ShieldAlert = createMaterialIcon('gpp_bad');
export const Bookmark = createMaterialIcon('bookmark');
export const Share2 = createMaterialIcon('share');
export const ShieldCheck = createMaterialIcon('verified_user');
export const Sliders = createMaterialIcon('tune');
export const Sparkles = createMaterialIcon('auto_awesome');
export const Split = createMaterialIcon('call_split');
export const Star = createMaterialIcon('star');
export const StopCircle = createMaterialIcon('stop_circle');
export const Tag = createMaterialIcon('sell');
export const Target = createMaterialIcon('track_changes');
export const Terminal = createMaterialIcon('terminal');
export const ThumbsDown = createMaterialIcon('thumb_down');
export const ThumbsUp = createMaterialIcon('thumb_up');
export const Timer = createMaterialIcon('timer');
export const Trash2 = createMaterialIcon('delete');
export const TrendingDown = createMaterialIcon('trending_down');
export const TrendingUp = createMaterialIcon('trending_up');
export const Trophy = createMaterialIcon('emoji_events');
export const UploadCloud = createMaterialIcon('cloud_upload');
export const User = createMaterialIcon('person');
export const UserCheck = createMaterialIcon('how_to_reg');
export const UserPlus = createMaterialIcon('person_add');
export const Users = createMaterialIcon('group');
export const Users2 = createMaterialIcon('groups');
export const Video = createMaterialIcon('videocam');
export const VideoOff = createMaterialIcon('videocam_off');
export const Volume2 = createMaterialIcon('volume_up');
export const Wallet = createMaterialIcon('account_balance_wallet');
export const Wand2 = createMaterialIcon('auto_fix_high');
export const Maximize2 = createMaterialIcon('fullscreen');
export const Wifi = createMaterialIcon('wifi');
export const X = createMaterialIcon('close');
export const XCircle = createMaterialIcon('cancel');
export const Zap = createMaterialIcon('bolt');
export const Bold = createMaterialIcon('format_bold');
export const Italic = createMaterialIcon('format_italic');
export const List = createMaterialIcon('format_list_bulleted');
export const Heading = createMaterialIcon('title');
export const Heart = createMaterialIcon('favorite');
export const AudioLines = createMaterialIcon('graphic_eq');
export const ChevronLeft = createMaterialIcon('chevron_left');
export const Sun = createMaterialIcon('light_mode');
export const Moon = createMaterialIcon('dark_mode');
