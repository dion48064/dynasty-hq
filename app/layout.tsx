import "./globals.css";

export const metadata = {
  title: "Dynasty Trade & League HQ",
  description: "Advanced dynasty fantasy football league manager and trade calculator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}