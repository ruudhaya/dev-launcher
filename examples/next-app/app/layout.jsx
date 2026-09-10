export const metadata = {
  title: 'example-next-app',
  description: 'Fixture dev server for devlaunch e2e tests.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ font: '16px system-ui', padding: '2rem' }}>{children}</body>
    </html>
  );
}
