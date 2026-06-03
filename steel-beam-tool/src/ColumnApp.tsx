interface ColumnAppProps {
  className?: string;
}

export default function ColumnApp({ className }: ColumnAppProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-center h-64 text-gray-500">
        Steel Column tool — coming soon
      </div>
    </div>
  );
}
