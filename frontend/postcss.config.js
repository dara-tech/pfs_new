import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

function fontDisplayBlock() {
  return {
    postcssPlugin: 'font-display-block',
    Once(root) {
      root.walkAtRules('font-face', (rule) => {
        let hasDisplay = false;
        rule.walkDecls('font-display', (decl) => {
          hasDisplay = true;
          decl.value = 'block';
        });
        if (!hasDisplay) {
          rule.append({ prop: 'font-display', value: 'block' });
        }
      });
    },
  };
}
fontDisplayBlock.postcss = true;

export default {
  plugins: [tailwindcss, autoprefixer, fontDisplayBlock()],
};
