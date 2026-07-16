export const downloadQRCodeSheet = async (data, googleSheetData) => {
  if (data.length === 0) {
    alert('No Orders found for download QrCodes');
    return;
  }
  // Sort orders by style_number in descending order
  data.sort((a, b) => {
    const styleA = String(a.style_number || '').toLowerCase();
    const styleB = String(b.style_number || '').toLowerCase();
    return styleB.localeCompare(styleA);
  });

  const headers = [
    'Channel',
    'Style Number',
    'Size',
    'Color',
    'Brand',
    'Date',
    'Pattern#',
    'Style Type',
    'Style Name',
    'Style 1',
    'Style 2',
    'Accessory 1',
    'Accessory 2',
    'Wash Care',
    '(Do not touch) Order Id',
    'image 100x100 qr image',
  ];

  const csvRows = [headers.join(',')];
  data.forEach((order) => {
    const pattern =
      googleSheetData.find((o) => Number(o.style_number) === order.style_number) || {};
    const row = [
      `"${order.channel || 'NA'}"`,
      `"${order.style_number || ''}"`,
      `"${order.size || ''}"`,
      `"${pattern.color || 'Other'}"`,
      `${'Qurvii'}`,
      `"${order.order_date || new Date().toLocaleString()}"`,
      `"${pattern.pattern_number || 'NA'}"`,
      `"${pattern.style_type || 'NA'}"`,
      `"${pattern.style_name || 'Qurvii Products'}"`,
      ``,
      `"${pattern.style_2 || ''}"`,
      `${pattern.accessory1 || ''}`,
      `${pattern.accessory2 || ''}`,
      `"${pattern.wash_care || ''}"`,
      `"${order.order_id || ''}"`,
      `"https://quickchart.io/qr?text=${order.order_id || ''}"`,
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `QR_CODE_SHEET${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
