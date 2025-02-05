import React, { useEffect, useState } from "react";
import { ref, get, set, remove, onValue } from "firebase/database";
import { db } from "../../firebase";
import styles from "./Admin.module.css";

const Admin = () => {
  const [tickets, setTickets] = useState([]);
  const [seats, setSeats] = useState([]);
  const [error, setError] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const ticketsRef = ref(db, "tickets");
    const seatsRef = ref(db, "seats");

    const ticketsListener = onValue(ticketsRef, (snapshot) => {
      if (snapshot.exists()) {
        const ticketsData = snapshot.val();
        const formattedTickets = Object.keys(ticketsData).map((ticketId) => ({
          ticketId,
          ...ticketsData[ticketId],
        }));
        setTickets(formattedTickets);
      } else {
        setTickets([]);
      }
    });

    const seatsListener = onValue(seatsRef, (snapshot) => {
      if (snapshot.exists()) {
        const seatsData = snapshot.val();
        const formattedSeats = Object.keys(seatsData).map((seatId) => ({
          seatId,
          available: seatsData[seatId].available,
          status: seatsData[seatId].status,
        }));
        setSeats(formattedSeats);
      } else {
        setSeats([]);
      }
    });

    return () => {
      ticketsListener();
      seatsListener();
    };
  }, []);

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset all tickets and seats? This action cannot be undone."
      )
    ) {
      setIsResetting(true);
      setError(null);
      setResetSuccess(false);

      try {
        const seatsRef = ref(db, "seats");
        const seatsSnapshot = await get(seatsRef);

        if (seatsSnapshot.exists()) {
          const seatsData = seatsSnapshot.val();
          const updatePromises = Object.keys(seatsData).map((seatId) => {
            return set(ref(db, `seats/${seatId}`), {
              available: true,
            });
          });
          await Promise.all(updatePromises);
        }

        const ticketsRef = ref(db, "tickets");
        await remove(ticketsRef);

        const currentTicketRef = ref(db, "current_ticket");
        await remove(currentTicketRef);

        await fetchTickets();
        await fetchSeats();

        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 3000);
      } catch (err) {
        console.error("Error resetting data:", err);
        setError("Failed to reset the system. Please try again.");
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className={styles.adminContainer}>
      <div className={styles.headerSection}>
        <h1 className={styles.header}>Admin Dashboard</h1>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {resetSuccess && (
        <p className={styles.success}>System successfully reset!</p>
      )}

      <div className={styles.tablesContainer}>
        <div className={styles.tableSection}>
          <h2>Tickets Details</h2>
          {tickets.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Seat ID</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.ticketId}>
                    <td>{ticket.ticketId}</td>
                    <td>{ticket.name}</td>
                    <td>{ticket.phone}</td>
                    <td>{ticket.seatId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.noData}>No tickets found.</p>
          )}
        </div>

        <div className={styles.tableSection}>
          <h2>Seats Availability</h2>
          {seats.length > 0 ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Seat ID</th>
                  <th>Availability</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((seat) => (
                  <tr key={seat.seatId}>
                    <td>{seat.seatId}</td>
                    <td>
                      {seat.available ? (
                        <span className={styles.available}>Available</span>
                      ) : (
                        <span className={styles.unavailable}>Booked</span>
                      )}
                    </td>
                    <td>{seat.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.noData}>No seats data found.</p>
          )}
        </div>
        <button
          className={`${styles.resetButton} ${
            isResetting ? styles.resetting : ""
          }`}
          onClick={handleReset}
          disabled={isResetting}
        >
          {isResetting ? "Resetting..." : "Reset All Tickets & Seats"}
        </button>
      </div>
    </div>
  );
};

export default Admin;
