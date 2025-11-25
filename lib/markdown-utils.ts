import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * Reads a markdown file from the content directory
 * @param filename - The name of the markdown file (without extension)
 * @param subdirectory - Optional subdirectory within content (e.g., 'legal')
 * @returns Object containing the content and optional frontmatter metadata
 */
export function getMarkdownContent(filename: string, subdirectory?: string) {
  const contentDirectory = path.join(process.cwd(), 'content', subdirectory || '');
  const filePath = path.join(contentDirectory, `${filename}.md`);

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      content,
      metadata: data,
    };
  } catch (error) {
    console.error(`Error reading markdown file: ${filePath}`, error);
    throw new Error(`Could not read markdown file: ${filename}`);
  }
}

/**
 * Gets all markdown files from a directory
 * @param subdirectory - Subdirectory within content
 * @returns Array of filenames (without extension)
 */
export function getAllMarkdownFiles(subdirectory?: string) {
  const contentDirectory = path.join(process.cwd(), 'content', subdirectory || '');

  try {
    const files = fs.readdirSync(contentDirectory);
    return files
      .filter((file) => file.endsWith('.md'))
      .map((file) => file.replace(/\.md$/, ''));
  } catch (error) {
    console.error(`Error reading directory: ${contentDirectory}`, error);
    return [];
  }
}
