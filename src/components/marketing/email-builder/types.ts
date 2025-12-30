export type BlockType = 'header' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'social' | 'footer';

export interface EmailBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  blocks: EmailBlock[];
  createdAt: Date;
  updatedAt: Date;
  category: 'promotional' | 'newsletter' | 'transactional' | 'welcome' | 'custom';
}

export const defaultBlockContent: Record<BlockType, Record<string, any>> = {
  header: {
    text: 'Your Company Name',
    fontSize: '24px',
    color: '#1a1a1a',
    alignment: 'center',
    logoUrl: '',
  },
  text: {
    text: 'Enter your text here...',
    fontSize: '16px',
    color: '#333333',
    alignment: 'left',
  },
  image: {
    src: 'https://placehold.co/600x300/e2e8f0/64748b?text=Your+Image',
    alt: 'Image description',
    width: '100%',
    alignment: 'center',
    link: '',
  },
  button: {
    text: 'Click Here',
    url: '#',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    alignment: 'center',
    borderRadius: '6px',
  },
  divider: {
    color: '#e2e8f0',
    thickness: '1px',
    style: 'solid',
    margin: '20px',
  },
  spacer: {
    height: '30px',
  },
  columns: {
    columns: 2,
    gap: '20px',
    content: [
      { text: 'Column 1 content' },
      { text: 'Column 2 content' },
    ],
  },
  social: {
    alignment: 'center',
    icons: ['facebook', 'twitter', 'instagram', 'linkedin'],
    iconSize: '32px',
  },
  footer: {
    text: '© 2024 Your Company. All rights reserved.',
    fontSize: '12px',
    color: '#6b7280',
    alignment: 'center',
    showUnsubscribe: true,
  },
};
