"use client";

export default function PunishmentsPage() {
  const punishments = [
    {
      manager: "Open Slot / TBD",
      infraction: "Last Place Finish",
      punishment: "The Last-Place Toilet Bowl Trophy & Draft Penalty",
      status: "Active",
    },
    {
      manager: "League Member",
      infraction: "Most WEEKS with Lowest Weekly Score",
      punishment: "24-hour Waffle House challenge (subtract 1 hour per win)",
      status: "Pending",
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">League Punishments</h1>
        <p className="text-muted-foreground mt-1">
          Tracking the accountability of The Ultimate Dynasty league bottom-dwellers.
        </p>
      </div>

      <div className="border rounded-lg overflow-hidden bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b font-semibold bg-muted/50">
          Official Wall of Shame
        </div>
        <div className="divide-y">
          {punishments.map((item, index) => (
            <div key={index} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="font-semibold text-lg">{item.manager}</div>
                <div className="text-sm text-muted-foreground">Infraction: {item.infraction}</div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium px-3 py-1 bg-secondary rounded-md">
                  {item.punishment}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}