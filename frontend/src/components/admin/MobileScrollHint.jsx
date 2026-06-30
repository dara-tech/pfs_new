import { useUIStore } from '../../lib/stores/uiStore';

/** Shown above wide export tables on narrow screens */
export default function MobileScrollHint() {
  const { locale } = useUIStore();
  const kh = locale === 'kh';

  return (
    <p className="mb-2 text-xs text-muted-foreground md:hidden">
      {kh
        ? 'អូសផ្ដោតទៅម្ដែងដើម្បីមើលជួរឈរទាំងអស់'
        : 'Swipe horizontally to see all columns'}
    </p>
  );
}
