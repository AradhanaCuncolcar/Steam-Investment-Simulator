
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#111111] text-[#F5F5F0] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}