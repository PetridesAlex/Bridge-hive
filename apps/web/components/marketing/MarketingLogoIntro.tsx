import Image from 'next/image';

/** Decorative marketing-page intro; the site remains server-rendered underneath. */
export function MarketingLogoIntro() {
  return (
    <div className="m-intro" aria-hidden="true">
      <div className="m-intro-lockup">
        <span className="m-intro-mark-wrap">
          <Image
            src="/brand/bridge-hive-logo-v2-512.png"
            alt=""
            width={512}
            height={512}
            sizes="(max-width: 600px) 144px, 192px"
            priority
            draggable={false}
            className="m-intro-mark"
          />
        </span>
        <p className="m-intro-name">
          BridgeHive <span>Medical Recruitment Limited</span>
        </p>
      </div>
    </div>
  );
}
