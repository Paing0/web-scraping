async function sendData() {
  const selectedElementValue = document.getElementById("url").value;
  const sendButton = document.getElementById("sendButton");
  const loader = document.getElementById("loader");
  const exchangeRate =
    Number(document.getElementById("exchangeRangeInput").value) || 0;

  // Hide the Send button and show the loader
  sendButton.style.display = "none";
  loader.style.display = "block";

  // Start timer
  const startTime = performance.now();

  try {
    const response = await fetch("http://localhost:3000/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: selectedElementValue, exchangeRate }),
    });
    console.log(response);

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || `Failed to generate file`);
    }

    const blob = await response.blob();
    // Create a link element and trigger the download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "products.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Calculate elapsed time
    const endTime = performance.now();
    const elapsedTimeInSeconds = (endTime - startTime) / 1000; // Convert to seconds
    const minutes = Math.floor(elapsedTimeInSeconds / 60);
    const seconds = (elapsedTimeInSeconds % 60).toFixed(2);

    const timeDisplay =
      minutes > 0
        ? `${minutes} minute${minutes > 1 ? "s" : ""} and ${seconds} seconds`
        : `${seconds} seconds`;

    alert(`File downloaded successfully!\nTotal time: ${timeDisplay}`);
  } catch (error) {
    alert(`Error: ${error.message}`);
    console.error("Error:", error);
  } finally {
    // Reset UI state regardless of success or failure
    sendButton.style.display = "block";
    loader.style.display = "none";
  }
}
