function downloadCertificate() {
    const doc = new jsPDF();
    doc.text("Certificate of Completion", 10, 10);
    doc.text("This certifies that [User Name] has successfully completed the Leadership and Teamwork course.", 10, 20);
    doc.save("certificate.pdf");
}