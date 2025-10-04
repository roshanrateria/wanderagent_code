import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TripPlannerFormProps {
  onSubmit: (details: {
    startAirport: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
  }) => void;
}

export default function TripPlannerForm({ onSubmit }: TripPlannerFormProps) {
  const [startAirport, setStartAirport] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ startAirport, destinationCity, startDate, endDate });
  };

  return (
    <form className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-8 mt-8" onSubmit={handleSubmit}>
      <h2 className="text-2xl font-bold mb-6 text-center">Plan Your Trip</h2>
      <div className="mb-4">
        <Label htmlFor="startAirport">Starting City</Label>
        <Input
          id="startAirport"
          type="text"
          value={startAirport}
          onChange={e => setStartAirport(e.target.value)}
          placeholder="e.g. Delhi, Mumbai"
          required
        />
      </div>
      <div className="mb-4">
        <Label htmlFor="destinationCity">Destination City</Label>
        <Input
          id="destinationCity"
          type="text"
          value={destinationCity}
          onChange={e => setDestinationCity(e.target.value)}
          placeholder="e.g. Jaipur, Goa"
          required
        />
      </div>
      <div className="mb-4">
        <Label htmlFor="startDate">Departure Date</Label>
        <Input
          id="startDate"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          required
        />
      </div>
      <div className="mb-6">
        <Label htmlFor="endDate">Return Date</Label>
        <Input
          id="endDate"
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-lg">
        Search Flights & Plan Itinerary
      </Button>
    </form>
  );
}
