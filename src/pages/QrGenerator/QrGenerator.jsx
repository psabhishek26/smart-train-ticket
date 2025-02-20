import React, { useState, useEffect, useRef } from "react";
import { ref, get, set } from "firebase/database";
import { QRCodeCanvas } from "qrcode.react";
import styles from "./QrGenerator.module.css";
import { db } from "../../firebase";

const QrGenerator = () => {
  const [formData, setFormData] = useState({
    name: "",
    destination: "",
    date: "",
    seatId: "",
  });
  const [seats, setSeats] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrValue, setQrValue] = useState("");
  const [error, setError] = useState("");
  const [ticketDetails, setTicketDetails] = useState(null);

  const qrCodeRef = useRef();

  useEffect(() => {
    const fetchSeatAvailability = async () => {
      const seatsRef = ref(db, "seats");
      try {
        const snapshot = await get(seatsRef);
        if (snapshot.exists()) {
          const seatsData = snapshot.val();
          const formattedSeats = {};
          Object.keys(seatsData).forEach((seatId) => {
            formattedSeats[seatId] = seatsData[seatId].available;
          });
          setSeats(formattedSeats);
        }
      } catch (err) {
        console.error("Error fetching seats");
        setError("Failed to load seat availability.");
      }
    };
    fetchSeatAvailability();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSeatSelection = (seatId) => {
    setFormData({ ...formData, seatId });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { name, destination, date, seatId } = formData;

    if (!name || !destination || !date || !seatId) {
      setError("Please fill in all fields and select a seat.");
      return;
    }

    const selectedDate = new Date(date);
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    if (selectedDate < currentDate) {
      setError("Please select a date that is not in the past.");
      return;
    }

    if (!seats[seatId]) {
      setError("The selected seat is not available.");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const ticketRef = ref(db, `tickets/${ticketId}`);
      
      const ticketData = {
        name,
        destination,
        date,
        seatId,
        createdAt: Date.now()
      };

      await set(ticketRef, ticketData);

      const seatRef = ref(db, `seats/${seatId}/available`);
      await set(seatRef, false);

      setQrValue(ticketId);
      setTicketDetails(ticketData);
      setFormData({ name: "", phone: "", seatId: "" });
    } catch (err) {
      console.error("Error generating QR code");
      setError("Failed to create the ticket.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    try {
      const canvas = qrCodeRef.current.querySelector("canvas");
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${qrValue}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading QR code");
      setError("Failed to download QR code.");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <h1>Ticket Generator</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="destination">Destination:</label>
            <input
              type="text"
              id="destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="Enter destination"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="destination">Date:</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              placeholder="Enter date"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Select a Seat:</label>
            <div className={styles.seatSelection}>
              {Object.keys(seats).map((seatId) => (
                <button
                  key={seatId}
                  type="button"
                  className={`${styles.seatButton} ${
                    seats[seatId] ? styles.available : styles.unavailable
                  } ${formData.seatId === seatId ? styles.selected : ""}`}
                  onClick={() => handleSeatSelection(seatId)}
                  disabled={!seats[seatId]}
                >
                  {seatId}
                </button>
              ))}
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitButton} disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate QR Code"}
          </button>
        </form>
      </div>

      {qrValue && (
        <div className={styles.qrContainer}>
          <div ref={qrCodeRef}>
            <h2>Generated Ticket</h2>
            <QRCodeCanvas
              value={qrValue}
              size={256}
              level="H"
              includeMargin={true}
              style={{ padding: '10px', background: 'white' }}
            />
            <div className={styles.ticketDetails}>
              <p><strong>Ticket ID:</strong> {qrValue}</p>
              {ticketDetails && (
                <>
                  <p><strong>Name:</strong> {ticketDetails.name}</p>
                  <p><strong>Seat:</strong> {ticketDetails.seatId}</p>
                </>
              )}
              <button onClick={handleDownload} className={styles.downloadButton}>
                Download QR Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QrGenerator;