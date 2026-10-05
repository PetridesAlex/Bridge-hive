import fs from 'node:fs/promises';
import path from 'node:path';

const webRoot = process.cwd();
const read = (...parts: string[]) => fs.readFile(path.join(webRoot, ...parts), 'utf8');

describe('about structure section', () => {
  it('ships the clear-structure band with three cards, CTAs, and no 3D image', async () => {
    const page = await read('app/(marketing)/about/page.tsx');
    const section = await read('components/marketing/AboutStructureSection.tsx');
    const css = await read('app/(marketing)/marketing.css');

    expect(page).toMatch(/AboutStructureSection/);
    expect(section).toMatch(/A clear structure for/);
    expect(section).toMatch(/Role honesty/);
    expect(section).toMatch(/Operational structure/);
    expect(section).toMatch(/Separated responsibilities/);
    expect(section).toMatch(/How it works/);
    expect(section).toMatch(/Partnership inquiry/);
    expect(section).not.toMatch(/about-structure-visual|structure-visual|\.webp|\.png/);
    expect(css).toMatch(/\.m-structure-band/);
    expect(css).toMatch(/\.m-structure-card/);
    expect(css).toMatch(/\.m-structure-actions/);
    expect(css).not.toMatch(/m-structure-visual/);
  });
});
