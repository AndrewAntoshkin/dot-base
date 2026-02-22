'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useGenerations } from '@/contexts/generations-context';
import { useUser } from '@/contexts/user-context';
import { GenerationsQueue } from './generations-queue';
import { FlowPickerModal } from './flow/flow-picker-modal';
import { FlowCreateModal } from './flow/flow-create-modal';

// ─── Navigation config ───────────────────────────────────────────────

interface SidebarNavItem {
  id: string;
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

const MAIN_NAV: SidebarNavItem[] = [
  { id: 'home', href: '/', label: 'Главная', icon: '/sidebar/icon-home.svg' },
  { id: 'image', href: '/', label: 'Image', icon: '/sidebar/icon-image.svg' },
  { id: 'video', href: '/video', label: 'Video', icon: '/sidebar/icon-video.svg' },
  { id: 'keyframes', href: '/keyframes', label: 'Keyframes', icon: '/sidebar/icon-keyframes.svg' },
  { id: 'lora', href: '/lora', label: 'LoRa', icon: '/sidebar/icon-lora.svg', adminOnly: true },
  { id: 'brainstorm', href: '/brainstorm', label: 'Brainstorm', icon: '/sidebar/icon-brainstorm.svg' },
  { id: 'flow', href: '/flow', label: 'Flow', icon: '/sidebar/icon-flow.svg' },
  { id: 'inpaint', href: '/inpaint', label: 'Inpaint', icon: '/sidebar/icon-inpaint.svg' },
  { id: 'outpaint', href: '/expand', label: 'Outpaint', icon: '/sidebar/icon-outpaint.svg' },
];

const BOTTOM_NAV: SidebarNavItem[] = [
  { id: 'docs', href: '/docs', label: 'Документация', icon: '/sidebar/icon-docs.svg' },
  { id: 'dashboard', href: '/admin', label: 'Dashboard', icon: '/sidebar/icon-dashboard.svg', adminOnly: true },
];

// ─── Inline SVG icons ────────────────────────────────────────────────

/** Toggle icon (layout-right) — exported from Figma */
function ToggleIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10 2V14M5.2 2H10.8C11.9201 2 12.4802 2 12.908 2.21799C13.2843 2.40973 13.5903 2.71569 13.782 3.09202C14 3.51984 14 4.0799 14 5.2V10.8C14 11.9201 14 12.4802 13.782 12.908C13.5903 13.2843 13.2843 13.5903 12.908 13.782C12.4802 14 11.9201 14 10.8 14H5.2C4.07989 14 3.51984 14 3.09202 13.782C2.71569 13.5903 2.40973 13.2843 2.21799 12.908C2 12.4802 2 11.9201 2 10.8V5.2C2 4.07989 2 3.51984 2.21799 3.09202C2.40973 2.71569 2.71569 2.40973 3.09202 2.21799C3.51984 2 4.0799 2 5.2 2Z"
        stroke="currentColor"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Logo text "basecraft" - extracted from Figma */
function LogoText() {
  return (
    <svg
      width="62"
      height="14"
      viewBox="12.5 2.5 49 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {/* "base" - white */}
      <path d="M15.7272 12.3424C15.3967 12.3424 15.1099 12.3084 14.8668 12.2404C14.6335 12.1626 14.439 12.0751 14.2835 11.9779C14.1085 11.8709 13.9578 11.7494 13.8314 11.6133L13.5397 12.2695H12.5918V3.08203H13.9043V6.36328C14.0307 6.22717 14.1814 6.10564 14.3564 5.9987C14.5119 5.9112 14.7015 5.82856 14.9251 5.75078C15.1487 5.673 15.4161 5.63412 15.7272 5.63412C16.1647 5.63412 16.573 5.71675 16.9522 5.88203C17.3314 6.04731 17.6619 6.28064 17.9439 6.58203C18.2355 6.8737 18.4592 7.2237 18.6147 7.63203C18.78 8.04036 18.8626 8.49245 18.8626 8.98828C18.8626 9.48412 18.78 9.9362 18.6147 10.3445C18.4592 10.7529 18.2355 11.1077 17.9439 11.4091C17.6619 11.7008 17.3314 11.9293 16.9522 12.0945C16.573 12.2598 16.1647 12.3424 15.7272 12.3424ZM15.6543 11.1029C15.9071 11.1029 16.1453 11.0543 16.3689 10.957C16.6022 10.8501 16.8064 10.7043 16.9814 10.5195C17.1564 10.3251 17.2925 10.1015 17.3897 9.8487C17.4967 9.5862 17.5501 9.29939 17.5501 8.98828C17.5501 8.67717 17.4967 8.39523 17.3897 8.14245C17.2925 7.87995 17.1564 7.65634 16.9814 7.47161C16.8064 7.27717 16.6022 7.13134 16.3689 7.03412C16.1453 6.92717 15.9071 6.8737 15.6543 6.8737C15.4015 6.8737 15.1585 6.92717 14.9251 7.03412C14.7015 7.13134 14.5022 7.27717 14.3272 7.47161C14.1522 7.65634 14.0112 7.87995 13.9043 8.14245C13.8071 8.39523 13.7585 8.67717 13.7585 8.98828C13.7585 9.29939 13.8071 9.5862 13.9043 9.8487C14.0112 10.1015 14.1522 10.3251 14.3272 10.5195C14.5022 10.7043 14.7015 10.8501 14.9251 10.957C15.1585 11.0543 15.4015 11.1029 15.6543 11.1029Z" fill="white" />
      <path d="M21.6628 12.3334C20.9336 12.3334 20.3746 12.1535 19.9857 11.7938C19.5968 11.4243 19.4023 10.9479 19.4023 10.3646C19.4023 10.034 19.4655 9.73752 19.5919 9.47502C19.7183 9.2028 19.9322 8.97432 20.2336 8.7896C20.5447 8.59515 20.9628 8.44446 21.4878 8.33751C22.0128 8.23057 22.6787 8.1771 23.4857 8.1771V7.95834C23.4857 7.62779 23.3788 7.36529 23.1649 7.17084C22.9607 6.96667 22.6544 6.86459 22.2461 6.86459C21.8086 6.86459 21.4878 6.94237 21.2836 7.09792C21.0892 7.25348 20.9725 7.44306 20.9336 7.66668H19.6211C19.66 7.08334 19.903 6.59723 20.3503 6.20834C20.8072 5.81944 21.4392 5.625 22.2461 5.625C22.6253 5.625 22.9704 5.68819 23.2815 5.81458C23.6024 5.93125 23.8746 6.09653 24.0982 6.31042C24.3218 6.51459 24.492 6.75764 24.6086 7.03959C24.735 7.32154 24.7982 7.62779 24.7982 7.95834V12.2604H23.8503L23.5586 11.6042C23.4322 11.7403 23.2815 11.8618 23.1065 11.9688C22.951 12.066 22.7517 12.1535 22.5086 12.2313C22.2753 12.2993 21.9933 12.3334 21.6628 12.3334ZM21.7357 11.1667C22.2899 11.1667 22.7176 11.0257 23.019 10.7438C23.3301 10.4521 23.4857 10.1021 23.4857 9.69377V9.34377C22.9024 9.34377 22.4308 9.37294 22.0711 9.43127C21.7114 9.47988 21.4294 9.5528 21.2253 9.65002C21.0211 9.73752 20.885 9.84933 20.8169 9.98544C20.7489 10.1215 20.7149 10.2722 20.7149 10.4375C20.7149 10.6222 20.8024 10.7924 20.9774 10.9479C21.1524 11.0938 21.4051 11.1667 21.7357 11.1667Z" fill="white" />
      <path d="M27.8327 12.3334C27.0257 12.3334 26.4181 12.1438 26.0098 11.7646C25.6112 11.3854 25.3924 10.8459 25.3535 10.1459H26.666C26.7049 10.4375 26.8167 10.6709 27.0014 10.8459C27.1862 11.0111 27.4632 11.0938 27.8327 11.0938C28.241 11.0938 28.5376 11.016 28.7223 10.8604C28.907 10.7049 28.9994 10.5153 28.9994 10.2917C28.9994 10.0972 28.9119 9.95141 28.7369 9.85419C28.5619 9.74724 28.3431 9.65974 28.0806 9.59169C27.8278 9.52363 27.5507 9.45557 27.2494 9.38752C26.948 9.30974 26.666 9.2028 26.4035 9.06668C26.1507 8.93057 25.9369 8.75071 25.7619 8.5271C25.5869 8.29376 25.4994 7.98265 25.4994 7.59376C25.4994 7.32154 25.5528 7.06876 25.6598 6.83542C25.7667 6.59237 25.9174 6.38334 26.1119 6.20834C26.3063 6.02361 26.5396 5.88264 26.8119 5.78542C27.0938 5.67847 27.4098 5.625 27.7598 5.625C28.5278 5.625 29.1112 5.80972 29.5098 6.17917C29.9084 6.54862 30.1271 7.04445 30.166 7.66668H28.8535C28.8146 7.44306 28.7028 7.25348 28.5181 7.09792C28.3431 6.94237 28.0903 6.86459 27.7598 6.86459C27.4292 6.86459 27.1764 6.94237 27.0014 7.09792C26.8264 7.24376 26.7389 7.40904 26.7389 7.59376C26.7389 7.7882 26.8264 7.9389 27.0014 8.04585C27.1764 8.14307 27.3903 8.22571 27.6431 8.29376C27.9056 8.36182 28.1876 8.43474 28.4889 8.51251C28.7903 8.58057 29.0674 8.68265 29.3202 8.81877C29.5827 8.95488 29.8015 9.1396 29.9765 9.37293C30.1515 9.59655 30.239 9.9028 30.239 10.2917C30.239 10.875 30.0299 11.3611 29.6119 11.75C29.1938 12.1389 28.6008 12.3334 27.8327 12.3334Z" fill="white" />
      <path d="M33.7682 12.0424C33.3307 12.0424 32.9224 11.9597 32.5432 11.7944C32.1641 11.6292 31.8287 11.4007 31.537 11.109C31.255 10.8076 31.0314 10.4528 30.8661 10.0444C30.7106 9.63609 30.6328 9.184 30.6328 8.68817C30.6328 8.19233 30.7106 7.74025 30.8661 7.33191C31.0314 6.92357 31.2502 6.57357 31.5224 6.28191C31.8043 5.98051 32.13 5.74718 32.4995 5.5819C32.8787 5.41662 33.2773 5.33398 33.6953 5.33398C34.1134 5.33398 34.5071 5.41662 34.8766 5.5819C35.2558 5.74718 35.5814 5.98051 35.8537 6.28191C36.1356 6.57357 36.3544 6.92357 36.5099 7.33191C36.6752 7.74025 36.7578 8.19233 36.7578 8.68817C36.7578 8.76595 36.753 8.84372 36.7433 8.9215C36.7335 8.98956 36.7238 9.04789 36.7141 9.0965C36.7044 9.16456 36.6946 9.22289 36.6849 9.2715H32.0182C32.0377 9.47567 32.096 9.67012 32.1932 9.85484C32.2905 10.0396 32.412 10.2048 32.5578 10.3507C32.7134 10.4868 32.8932 10.5986 33.0974 10.6861C33.3113 10.7639 33.5349 10.8028 33.7682 10.8028C34.1669 10.8028 34.4828 10.7201 34.7162 10.5548C34.9495 10.3798 35.1196 10.2194 35.2266 10.0736H36.612C36.5051 10.3458 36.369 10.6035 36.2037 10.8465C36.0384 11.0798 35.8391 11.2889 35.6058 11.4736C35.3724 11.6486 35.1002 11.7896 34.7891 11.8965C34.4877 11.9937 34.1474 12.0424 33.7682 12.0424ZM35.5183 8.17775C35.4405 7.70136 35.246 7.31733 34.9349 7.02566C34.6238 6.72427 34.2106 6.57357 33.6953 6.57357C33.2578 6.57357 32.8884 6.72427 32.587 7.02566C32.2856 7.31733 32.096 7.70136 32.0182 8.17775H35.5183Z" fill="white" />
      <path d="M15.8014 12.3347C15.4709 12.3347 15.1841 12.3007 14.941 12.2326C14.7077 12.1548 14.5132 12.0673 14.3577 11.9701C14.1827 11.8632 14.032 11.7416 13.9056 11.6055L13.6139 12.2618H12.666V3.07422H13.9785V6.35548C14.1049 6.21937 14.2556 6.09785 14.4306 5.9909C14.5862 5.9034 14.7757 5.82076 14.9994 5.74298C15.223 5.6652 15.4903 5.62632 15.8014 5.62632C16.239 5.62632 16.6473 5.70895 17.0265 5.87423C17.4056 6.03951 17.7362 6.27285 18.0181 6.57424C18.3098 6.8659 18.5334 7.21591 18.689 7.62424C18.8542 8.03258 18.9369 8.48466 18.9369 8.9805C18.9369 9.47633 18.8542 9.92842 18.689 10.3368C18.5334 10.7451 18.3098 11.1 18.0181 11.4013C17.7362 11.693 17.4056 11.9215 17.0265 12.0868C16.6473 12.252 16.239 12.3347 15.8014 12.3347ZM15.7285 11.0951C15.9813 11.0951 16.2195 11.0465 16.4431 10.9493C16.6765 10.8423 16.8806 10.6965 17.0556 10.5118C17.2306 10.3173 17.3667 10.0937 17.464 9.84092C17.5709 9.57842 17.6244 9.29161 17.6244 8.9805C17.6244 8.66939 17.5709 8.38744 17.464 8.13466C17.3667 7.87216 17.2306 7.64855 17.0556 7.46382C16.8806 7.26938 16.6765 7.12354 16.4431 7.02632C16.2195 6.91938 15.9813 6.8659 15.7285 6.8659C15.4758 6.8659 15.2327 6.91938 14.9994 7.02632C14.7757 7.12354 14.5764 7.26938 14.4014 7.46382C14.2264 7.64855 14.0855 7.87216 13.9785 8.13466C13.8813 8.38744 13.8327 8.66939 13.8327 8.9805C13.8327 9.29161 13.8813 9.57842 13.9785 9.84092C14.0855 10.0937 14.2264 10.3173 14.4014 10.5118C14.5764 10.6965 14.7757 10.8423 14.9994 10.9493C15.2327 11.0465 15.4758 11.0951 15.7285 11.0951Z" fill="white" />
      {/* "craft" - gray */}
      <path d="M40.2839 12.3334C39.8464 12.3334 39.438 12.2507 39.0589 12.0854C38.6797 11.9202 38.3443 11.6917 38.0526 11.4C37.7707 11.0986 37.5471 10.7438 37.3818 10.3354C37.2262 9.9271 37.1484 9.47502 37.1484 8.97918C37.1484 8.48335 37.2262 8.03126 37.3818 7.62293C37.5471 7.21459 37.7707 6.86459 38.0526 6.57292C38.3443 6.27153 38.6797 6.0382 39.0589 5.87292C39.438 5.70764 39.8464 5.625 40.2839 5.625C40.663 5.625 41.013 5.68819 41.3339 5.81458C41.6644 5.94097 41.9561 6.11597 42.2089 6.33959C42.4617 6.5632 42.6707 6.8257 42.836 7.12709C43.0012 7.42848 43.1228 7.75418 43.2006 8.10418H41.8151C41.7082 7.73473 41.5283 7.4382 41.2755 7.21459C41.0228 6.98126 40.6922 6.86459 40.2839 6.86459C40.0505 6.86459 39.8221 6.91806 39.5985 7.02501C39.3748 7.12223 39.1804 7.26806 39.0151 7.46251C38.8498 7.64723 38.7137 7.87084 38.6068 8.13335C38.5096 8.38612 38.4609 8.66807 38.4609 8.97918C38.4609 9.2903 38.5096 9.5771 38.6068 9.8396C38.7137 10.0924 38.8498 10.316 39.0151 10.5104C39.1804 10.6952 39.3748 10.841 39.5985 10.9479C39.8221 11.0452 40.0505 11.0938 40.2839 11.0938C40.6922 11.0938 41.0228 10.982 41.2755 10.7584C41.5283 10.525 41.7082 10.2236 41.8151 9.85419H43.2006C43.1228 10.2042 43.0012 10.5299 42.836 10.8313C42.6707 11.1327 42.4617 11.3952 42.2089 11.6188C41.9561 11.8424 41.6644 12.0174 41.3339 12.1438C41.013 12.2702 40.663 12.3334 40.2839 12.3334Z" fill="#5D5D5D" />
      <path d="M43.7676 5.69792H44.7155L45.0072 6.35417C45.1238 6.21806 45.2648 6.09653 45.4301 5.98959C45.5662 5.90208 45.7363 5.81945 45.9405 5.74167C46.1544 5.66389 46.4023 5.625 46.6843 5.625C46.762 5.625 46.8252 5.62986 46.8738 5.63958C46.9225 5.64931 46.9662 5.65903 47.0051 5.66875C47.044 5.67847 47.0829 5.68819 47.1218 5.69792V7.01042C47.0829 7.0007 47.0391 6.99098 46.9905 6.98126C46.9419 6.97153 46.8884 6.96181 46.8301 6.95209C46.7815 6.94237 46.7329 6.93751 46.6843 6.93751C46.4606 6.93751 46.2516 6.98126 46.0572 7.06876C45.8627 7.15626 45.6926 7.27292 45.5468 7.41876C45.4009 7.56459 45.2842 7.73473 45.1967 7.92918C45.119 8.12362 45.0801 8.32779 45.0801 8.54168V12.2604H43.7676V5.69792Z" fill="#5D5D5D" />
      <path d="M49.4968 12.3334C48.7676 12.3334 48.2086 12.1535 47.8197 11.7938C47.4308 11.4243 47.2363 10.9479 47.2363 10.3646C47.2363 10.034 47.2995 9.73752 47.4259 9.47502C47.5523 9.2028 47.7662 8.97432 48.0676 8.7896C48.3787 8.59515 48.7968 8.44446 49.3218 8.33751C49.8468 8.23057 50.5127 8.1771 51.3197 8.1771V7.95834C51.3197 7.62779 51.2127 7.36529 50.9988 7.17084C50.7947 6.96667 50.4884 6.86459 50.0801 6.86459C49.6426 6.86459 49.3218 6.94237 49.1176 7.09792C48.9231 7.25348 48.8065 7.44306 48.7676 7.66668H47.4551C47.494 7.08334 47.737 6.59723 48.1843 6.20834C48.6412 5.81944 49.2731 5.625 50.0801 5.625C50.4593 5.625 50.8044 5.68819 51.1155 5.81458C51.4364 5.93125 51.7086 6.09653 51.9322 6.31042C52.1558 6.51459 52.3259 6.75764 52.4426 7.03959C52.569 7.32154 52.6322 7.62779 52.6322 7.95834V12.2604H51.6843L51.3926 11.6042C51.2662 11.7403 51.1155 11.8618 50.9405 11.9688C50.785 12.066 50.5857 12.1535 50.3426 12.2313C50.1093 12.2993 49.8273 12.3334 49.4968 12.3334ZM49.5697 11.1667C50.1238 11.1667 50.5516 11.0257 50.853 10.7438C51.1641 10.4521 51.3197 10.1021 51.3197 9.69377V9.34377C50.7363 9.34377 50.2648 9.37294 49.9051 9.43127C49.5454 9.47988 49.2634 9.5528 49.0593 9.65002C48.8551 9.73752 48.719 9.84933 48.6509 9.98544C48.5829 10.1215 48.5488 10.2722 48.5488 10.4375C48.5488 10.6222 48.6363 10.7924 48.8113 10.9479C48.9863 11.0938 49.2391 11.1667 49.5697 11.1667Z" fill="#5D5D5D" />
      <path d="M53.8958 6.93752H53.0938V5.69793H53.8958V5.26043C53.8958 4.91043 53.9445 4.59931 54.0417 4.32709C54.1486 4.04514 54.2944 3.80695 54.4792 3.6125C54.6639 3.41806 54.8778 3.26736 55.1208 3.16042C55.3736 3.05347 55.6458 3 55.9375 3C56.0445 3 56.1417 3.00972 56.2292 3.02917C56.3167 3.03889 56.3945 3.05347 56.4625 3.07292C56.5403 3.10208 56.6084 3.12639 56.6667 3.14583V4.31251C56.6278 4.30278 56.584 4.29306 56.5354 4.28334C56.4868 4.27362 56.4334 4.26389 56.375 4.25417C56.3264 4.24445 56.2778 4.23959 56.2292 4.23959C55.9375 4.23959 55.6945 4.33681 55.5 4.53126C55.3056 4.7257 55.2083 4.96876 55.2083 5.26043V5.69793H57.1089V6.93752H55.2083V12.2605H53.8958V6.93752Z" fill="#5D5D5D" />
      <path d="M59.3412 12.3327C59.0495 12.3327 58.7773 12.2793 58.5245 12.1723C58.2814 12.0654 58.0675 11.9147 57.8828 11.7202C57.6981 11.5258 57.5523 11.2924 57.4453 11.0202C57.3481 10.7383 57.2995 10.4223 57.2995 10.0723V6.93686H56.1328V5.69728H56.6432C56.896 5.69728 57.105 5.61464 57.2703 5.44936C57.4356 5.28408 57.5182 5.07505 57.5182 4.82227V3.94727H58.612V5.69728H60.0703V6.93686H58.612V10.0723C58.612 10.364 58.7092 10.607 58.9037 10.8015C59.0981 10.9959 59.3412 11.0931 59.6328 11.0931C59.6814 11.0931 59.7301 11.0931 59.7787 11.0931C59.837 11.0834 59.8905 11.0737 59.9391 11.064C59.9877 11.0542 60.0314 11.0397 60.0703 11.0202V12.1869C60.012 12.2161 59.9439 12.2404 59.8662 12.2598C59.7203 12.3084 59.5453 12.3327 59.3412 12.3327Z" fill="#5D5D5D" />
    </svg>
  );
}

// ─── Active state helpers ────────────────────────────────────────────

function getActiveId(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname === '/video') return 'video';
  if (pathname === '/keyframes') return 'keyframes';
  if (pathname === '/lora') return 'lora';
  if (pathname === '/brainstorm') return 'brainstorm';
  if (pathname === '/flow' || pathname.startsWith('/flow')) return 'flow';
  if (pathname === '/inpaint') return 'inpaint';
  if (pathname === '/expand') return 'outpaint';
  if (pathname === '/docs' || pathname.startsWith('/docs')) return 'docs';
  if (pathname === '/admin' || pathname.startsWith('/admin')) return 'dashboard';
  return '';
}

// ─── Sidebar Component ──────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isFlowPickerOpen, setIsFlowPickerOpen] = useState(false);
  const [isFlowCreateOpen, setIsFlowCreateOpen] = useState(false);
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const { unviewedCount, hasActiveGenerations } = useGenerations();
  const { isAdmin } = useUser();
  const activeId = getActiveId(pathname);

  // Persist collapsed/expanded state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-expanded');
    if (saved !== null) setIsExpanded(saved === 'true');
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', String(isExpanded));
  }, [isExpanded]);

  const visibleMain = MAIN_NAV.filter((item) => !item.adminOnly || isAdmin);
  const visibleBottom = BOTTOM_NAV.filter((item) => !item.adminOnly || isAdmin);

  // Handle creating a new flow from the create modal
  const handleCreateFlow = useCallback(async (data: {
    name: string;
    description: string;
    members: { email: string; role: 'editor' | 'viewer' }[];
  }) => {
    setIsCreatingFlow(true);
    try {
      const response = await fetch('/api/flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          members: data.members,
          nodes: [],
          edges: [],
          viewport_x: 0,
          viewport_y: 0,
          viewport_zoom: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create flow');
      }

      setIsFlowCreateOpen(false);
      router.push(`/flow?id=${result.flow.id}`);
    } catch (err) {
      console.error('Error creating flow:', err);
    } finally {
      setIsCreatingFlow(false);
    }
  }, [router]);

  return (
    <aside
      className={`hidden lg:flex flex-col justify-between bg-[#171717] rounded-2xl flex-shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden ${
        isExpanded ? 'w-[248px]' : 'w-[48px]'
      }`}
      style={{ padding: '12px 4px', height: '100%' }}
    >
      {/* ── Top section ── */}
      <div className="flex flex-col gap-2">
        {/* Logo + Toggle */}
        <div
          className={`flex items-center gap-2 ${
            isExpanded
              ? 'justify-between px-3 pb-1'
              : 'flex-col justify-center items-center px-3 pb-1'
          }`}
        >
          {isExpanded && <LogoText />}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#303030] text-[#717171] hover:text-white hover:border-[#404040] transition-colors flex-shrink-0"
            aria-label={isExpanded ? 'Свернуть меню' : 'Развернуть меню'}
          >
            <ToggleIcon />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex flex-col gap-1">
          {visibleMain.map((item) => {
            const active = activeId === item.id;
            const isFlow = item.id === 'flow';

            const itemClasses = `flex items-center rounded-xl transition-colors ${
              isExpanded
                ? 'gap-3 px-3 py-2'
                : 'justify-center w-10 h-10 mx-auto'
            } ${active ? 'bg-[#212121]' : 'hover:bg-[#212121]/50'}`;

            const activeIconFilter = 'brightness(0) invert(1) sepia(1) saturate(4) hue-rotate(5deg) brightness(0.94)';
            const iconEl = (
              <Image
                src={item.icon}
                alt=""
                width={16}
                height={16}
                className="flex-shrink-0"
                style={active ? { filter: activeIconFilter } : undefined}
              />
            );

            const labelEl = isExpanded ? (
              <span
                className={`font-inter font-medium text-sm leading-[22px] tracking-[-0.01em] capitalize whitespace-nowrap ${
                  active ? 'text-white' : 'text-[#6E6E6E]'
                }`}
              >
                {item.label}
              </span>
            ) : null;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={itemClasses}
              >
                {iconEl}
                {labelEl}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom section ── */}
      <div className="flex flex-col gap-2">
        {/* Generations badge */}
        <div className="relative">
          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`flex items-center w-full transition-colors rounded-lg ${
              isExpanded
                ? 'gap-2 px-1 py-2'
                : 'justify-center py-2'
            }`}
          >
            <div
              className={`flex items-center justify-center rounded-xl border border-[#303030] flex-shrink-0 ${
                isExpanded ? 'w-8 h-8' : 'w-9 h-9'
              }`}
            >
              {hasActiveGenerations ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <span className="font-inter font-medium text-base text-white tracking-[-0.02em]">
                  {unviewedCount}
                </span>
              )}
            </div>
            {isExpanded && (
              <span className="font-inter font-medium text-sm leading-[22px] tracking-[-0.01em] text-[#6E6E6E] whitespace-nowrap capitalize">
                Генерации
              </span>
            )}
          </button>

          {/* Queue dropdown */}
          <GenerationsQueue
            isOpen={isQueueOpen}
            onClose={() => setIsQueueOpen(false)}
          />
        </div>

        {/* Bottom nav */}
        <nav className="flex flex-col gap-1">
          {visibleBottom.map((item) => {
            const active = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center rounded-lg transition-colors ${
                  isExpanded
                    ? 'gap-3 px-3 py-2'
                    : 'justify-center w-10 h-10 mx-auto'
                } ${active ? 'bg-[#212121]' : 'hover:bg-[#212121]/50'}`}
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={16}
                  height={16}
                  className="flex-shrink-0"
                  style={active ? { filter: 'brightness(0) invert(1) sepia(1) saturate(4) hue-rotate(5deg) brightness(0.94)' } : undefined}
                />
                {isExpanded && (
                  <span
                    className={`font-inter font-medium text-sm leading-[22px] tracking-[-0.01em] capitalize whitespace-nowrap ${
                      active ? 'text-white' : 'text-[#6E6E6E]'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Flow Picker Modal */}
      <FlowPickerModal
        isOpen={isFlowPickerOpen}
        onClose={() => setIsFlowPickerOpen(false)}
        onCreateNew={() => {
          setIsFlowPickerOpen(false);
          setIsFlowCreateOpen(true);
        }}
      />

      {/* Flow Create Modal */}
      <FlowCreateModal
        isOpen={isFlowCreateOpen}
        onClose={() => setIsFlowCreateOpen(false)}
        onSubmit={handleCreateFlow}
        isLoading={isCreatingFlow}
      />
    </aside>
  );
}
