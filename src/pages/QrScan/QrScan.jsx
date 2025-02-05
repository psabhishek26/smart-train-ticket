import React, { useState, useEffect, useRef } from "react";
import { ref, get, set, remove } from "firebase/database";
import { db } from "../../firebase";
import styles from "./QrScan.module.css";
import { Html5Qrcode } from "html5-qrcode";

const QrScan = () => {
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode("reader");

    return () => {
      if (html5QrCodeRef.current && isScanning) {
        html5QrCodeRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const updateCurrTicket = async () => {
      if (userData) {
        try {
          const ticketRef = ref(db, `current_ticket`);
          await set(ticketRef, {
            name: userData.name,
            ticket_id: userData.ticketId,
            seat_id: userData.seatId,
          });
        } catch (error) {
          console.error("Failed to update current ticket");
        }
      }
    };

    updateCurrTicket();
  }, [userData]);

  const startScanner = () => {
    setError(null);

    const config = {
      fps: 10,
      qrbox: { width: 300, height: 300 },
    };

    html5QrCodeRef.current
      .start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (userData && userData.ticketId === decodedText) {
            return;
          }
          await fetchTicketData(decodedText);
        },
        (errorMessage) => {
          console.log("Scan in progress...");
        }
      )
      .then(() => {
        setIsScanning(true);
      })
      .catch((err) => {
        setError("Error starting scanner: " + err);
      });
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const fetchTicketData = async (ticketId) => {
    setError(null);
    const userRef = ref(db, `tickets/${ticketId}`);
    try {
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData({ ...data, ticketId });
        await stopScanner();
      } else {
        setError("No data found for this ticket ID.");
        setUserData(null);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch ticket details.");
      setUserData(null);
    }
  };

  const handleReset = async () => {
    try {
      const currentTicketRef = ref(db, "current_ticket");
      await remove(currentTicketRef);

      setUserData(null);
      setError(null);
      if (isScanning) {
        await stopScanner();
      }
      startScanner();
    } catch (error) {
      console.error("Error resetting current ticket", error);
    }
  };

  return (
    <div className={styles.scannerContainer}>
      <h1 className={styles.header}>Train Ticket Scanner</h1>
      <div className={styles.scannerContent}>
        <div className={styles.qrScannerContainer}>
          <div id="reader" className="qrcode-reader"></div>
          <p className={styles.instructions}>
            Point your camera at the QR code to scan the ticket.
          </p>
          {!isScanning ? (
            <button
              className={`${styles.scanButton} ${styles.startButton}`}
              onClick={startScanner}
            >
              Start Scanner
            </button>
          ) : (
            <button
              className={`${styles.scanButton} ${styles.stopButton}`}
              onClick={stopScanner}
            >
              Stop Scanner
            </button>
          )}
        </div>
        <div className={styles.detailsContainer}>
          {userData ? (
            <>
              <h2>Scanned Ticket ID:</h2>
              <p className={styles.ticketId}>{userData.ticketId}</p>
              <div className={styles.userDetails}>
                <p>
                  <strong>Name:</strong> {userData.name}
                </p>
                <p>
                  <strong>Phone:</strong> {userData.phone}
                </p>
                <p>
                  <strong>Seat ID:</strong> {userData.seatId}
                </p>
              </div>
              <button className={styles.resetButton} onClick={handleReset}>
                Reset Scanner
              </button>
            </>
          ) : (
            <p className={styles.placeholder}>
              No ticket scanned. Scan a QR code to view ticket details.
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default QrScan;
