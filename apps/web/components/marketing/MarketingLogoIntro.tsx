import Image from 'next/image';

import { BRIDGE_HIVE_MARK_SRC } from '@/components/brand/BridgeHiveMark';

/** Brief decorative reveal on a full marketing-page load; the page remains rendered underneath. */
export function MarketingLogoIntro() {
  return (
    <div className="m-intro" aria-hidden="true">
      <Image
        src={BRIDGE_HIVE_MARK_SRC}
        alt=""
        width={192}
        height={192}
        sizes="(max-width: 600px) 96px, 128px"
        priority
        draggable={false}
        className="m-intro-mark"
      />
    </div>
  );
}
