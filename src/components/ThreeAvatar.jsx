import React from "react";

export default function ThreeAvatar() {
  return (
    <div id="ai-avatar" className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-center p-4 transition-all duration-300">
      <div 
        className="absolute inset-0 pointer-events-none opacity-25" 
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(59,130,246,0.3) 0%, transparent 70%)"
        }}
      />
      
      {/* Human Athletic Coach Vector Canvas */}
      <svg viewBox="0 0 160 160" className="w-[150px] h-[150px] drop-shadow-[0_15px_25px_rgba(37,99,235,0.25)] select-none">
        {/* Glow behind the back */}
        <circle cx="80" cy="80" r="55" fill="url(#avatarInnerGlow)" />
        
        {/* Outer orbital rings (High performance telemetry vibe) */}
        <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(37,99,235,0.1)" strokeWidth="1" strokeDasharray="3 3" className="animate-[spin_40s_linear_infinite]" />

        {/* 1. SHOULDERS & SPORTS UNIFORM */}
        {/* Realistic shoulders with posture */}
        <path 
          d="M 22 155 C 32 120, 60 115, 80 115 C 100 115, 128 120, 138 155 Z" 
          fill="url(#sportsJacketBody)" 
          stroke="rgba(37,99,235,0.4)" 
          strokeWidth="1"
        />
        {/* Under shirt fabric fold */}
        <path d="M 62 115 L 80 135 L 98 115 Z" fill="#0f172a" />
        
        {/* Premium Gold/Teal Tracksuit Trim and Zip line */}
        <path d="M 64 122 L 80 142 L 96 122" stroke="url(#goldTrim)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 80 135 L 80 155" stroke="url(#goldTrim)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="80" cy="135" r="3.5" fill="#f59e0b" /> {/* Zipper slider */}

        {/* 2. EARS & SKIN UNDERLAYERS */}
        <circle cx="43" cy="74" r="8" fill="url(#humanSkinMedium)" />
        <circle cx="43" cy="74" r="5" fill="url(#humanSkinShadow)" />
        <circle cx="117" cy="74" r="8" fill="url(#humanSkinMedium)" />
        <circle cx="117" cy="74" r="3.5" fill="url(#humanSkinShadow)" opacity="0.8" />

        {/* 3. NECK */}
        <path d="M 66 82 L 66 118 C 66 122, 94 122, 94 118 L 94 82 Z" fill="url(#humanSkinMedium)" />
        {/* Muscle definition/shadow under chin */}
        <path d="M 66 82 Q 80 94 94 82 Q 80 102 66 82 Z" fill="url(#humanSkinShadow)" />

        {/* 4. FACE CONTOUR */}
        {/* 3D-Shaded jawline and cheeks */}
        <path 
          d="M 45 52 C 45 42, 55 32, 80 32 C 105 32, 115 42, 115 52 C 115 78, 102 96, 80 96 C 58 96, 45 78, 45 52 Z" 
          fill="url(#humanSkinFace)" 
          stroke="rgba(15,23,42,0.15)"
          strokeWidth="1"
        />
        
        {/* Soft, realistic beard shadow/stubble */}
        <path 
          d="M 46 64 C 46 80, 52 92, 80 95 C 108 92, 114 80, 114 64 C 114 62, 112 62, 112 64 C 112 76, 106 87, 80 89 C 54 87, 48 76, 48 64 Z" 
          fill="url(#beardGreyGlow)" 
          opacity="0.85" 
        />

        {/* 5. PROFESSIONAL SHORT ATHLETIC HAIRSTYLE */}
        {/* Base hair mass with realistic texturing */}
        <path 
          d="M 44 48 C 40 40, 48 24, 80 24 C 112 24, 120 40, 116 48 C 111 40, 107 33, 80 31 C 53 33, 49 40, 44 48 Z" 
          fill="url(#hairPrimary)" 
        />
        {/* Sideburns */}
        <path d="M 45 44 L 44 58 L 47 58 Z" fill="url(#hairPrimary)" />
        <path d="M 115 44 L 116 58 L 113 58 Z" fill="url(#hairPrimary)" />

        {/* Hair highlight strands for organic volume */}
        <path d="M 54 30 Q 80 26 106 30" stroke="url(#hairHighlights)" strokeWidth="2.5" fill="none" opacity="0.4" />
        <path d="M 64 28 Q 80 25 96 28" stroke="url(#hairHighlights)" strokeWidth="1.5" fill="none" opacity="0.6" />

        {/* 6. ADVANCED ORGANIC EYES & EYEBROWS */}
        {/* Left eye and eyebrow structure */}
        <g id="avatar-eye-left" style={{ transformOrigin: '61px 54px', transition: 'transform 110ms ease-out' }}>
          {/* Detailed athletic eyebrow */}
          <path d="M 49 45 Q 60 41 68 46" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Eye crease shadow */}
          <path d="M 50 49 Q 60 47 68 49" stroke="rgba(120,53,4,0.25)" strokeWidth="1.5" fill="none" />
          {/* Sclera (White eye background) */}
          <ellipse cx="59" cy="53.5" rx="9" ry="5.5" fill="#ffffff" stroke="#1c1917" strokeWidth="1" />
          {/* Detailed Iris (Hazel/Blue athletic look) */}
          <circle cx="59" cy="53.5" r="4.8" fill="url(#irisGrad)" />
          {/* Pupil */}
          <circle cx="59" cy="53.5" r="2.5" fill="#090505" />
          {/* Realistic light reflections */}
          <circle cx="57.5" cy="52" r="1.1" fill="#ffffff" />
          <circle cx="60.5" cy="55" r="0.6" fill="#ffffff" opacity="0.6" />
        </g>
        
        {/* Right eye and eyebrow structure */}
        <g id="avatar-eye-right" style={{ transformOrigin: '101px 54px', transition: 'transform 110ms ease-out' }}>
          {/* Detailed athletic eyebrow */}
          <path d="M 92 46 Q 100 41 111 45" stroke="#1c1917" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Eye crease shadow */}
          <path d="M 92 49 Q 100 47 110 49" stroke="rgba(120,53,4,0.25)" strokeWidth="1.5" fill="none" />
          {/* Sclera (White eye background) */}
          <ellipse cx="101" cy="53.5" rx="9" ry="5.5" fill="#ffffff" stroke="#1c1917" strokeWidth="1" />
          {/* Detailed Iris (Hazel/Blue athletic look) */}
          <circle cx="101" cy="53.5" r="4.8" fill="url(#irisGrad)" />
          {/* Pupil */}
          <circle cx="101" cy="53.5" r="2.5" fill="#090505" />
          {/* Realistic light reflections */}
          <circle cx="99.5" cy="52" r="1.1" fill="#ffffff" />
          <circle cx="102.5" cy="55" r="0.6" fill="#ffffff" opacity="0.6" />
        </g>

        {/* 7. DETAILED HUMAN NOSE */}
        {/* Soft shadow to construct face depth */}
        <path d="M 77 53 L 75 74 L 80 77" fill="none" stroke="rgba(120,53,4,0.18)" strokeWidth="3" strokeLinecap="round" />
        <path d="M 74 74 Q 80 78 86 74" fill="none" stroke="rgba(120,53,4,0.2)" strokeWidth="2" strokeLinecap="round" />
        <path d="M 76 74 Q 80 72 84 74" fill="none" stroke="#fecdd3" strokeWidth="1.2" strokeLinecap="round" />

        {/* 8. INTERACTIVE LIP-SYNC MOUTH SHAPE */}
        {/* Real human Lip contours overlayed */}
        <path d="M 60 84 Q 80 81 100 84" stroke="rgba(120,53,4,0.25)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path 
          id="avatar-mouth"
          d="M 60 85 Q 80 77 100 85 Q 80 83 60 85" 
          fill="#e11d48" 
          stroke="#4c0519" 
          strokeWidth="1.5"
          className="transition-all duration-100"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Realistic subtle human blush/cheekbones structure */}
        <circle cx="51" cy="68" r="4.5" fill="#f43f5e" opacity="0.1" />
        <circle cx="109" cy="68" r="4.5" fill="#f43f5e" opacity="0.1" />

        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="avatarInnerGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(37,99,235,0.4)" />
            <stop offset="100%" stopColor="rgba(15,23,42,0)" />
          </linearGradient>

          {/* Realistic skin gradient mapping depth & shadow */}
          <linearGradient id="humanSkinFace" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="40%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#fdbb2d" opacity="0.85" />
          </linearGradient>

          <linearGradient id="humanSkinMedium" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fed7aa" />
            <stop offset="100%" stopColor="#f97316" opacity="0.7" />
          </linearGradient>

          <linearGradient id="humanSkinShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(194,65,12,0.25)" />
            <stop offset="100%" stopColor="rgba(120,53,4,0.45)" />
          </linearGradient>

          {/* beard shading stubble */}
          <linearGradient id="beardGreyGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(115,115,115,0.25)" />
            <stop offset="100%" stopColor="rgba(38,38,38,0.5)" />
          </linearGradient>

          {/* Athletic hair details */}
          <linearGradient id="hairPrimary" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#292524" />
            <stop offset="100%" stopColor="#1c1917" />
          </linearGradient>
          <linearGradient id="hairHighlights" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="50%" stopColor="#a8a29e" />
            <stop offset="100%" stopColor="#44403c" />
          </linearGradient>

          {/* Iris color */}
          <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </radialGradient>

          {/* Professional Sports Jacket Attire */}
          <linearGradient id="sportsJacketBody" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="45%" stopColor="#1d4ed8" />
            <stop offset="55%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>

      {/* Dynamic speech label below */}
      <div className="z-10 text-center mt-3 space-y-1">
        <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">AI Digital Twin Coach</h4>
        <p id="avatar-status" className="text-[11px] text-blue-400 font-extrabold tracking-wide uppercase transition-all duration-350 min-h-[16px]">
          Ready to coach you 🎤
        </p>
      </div>
    </div>
  );
}
