import axios from 'axios';
const fetchstyleDetailsFromGoogleSheet = async () => {
  try {
    const sheetId = '1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E';
    const apiKey = import.meta.env.VITE_GOOGLE_SHEET_API_KEY;
    const range = 'DB!A1:I';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

    const response = await axios.get(url);

    const styles = [];

    for (let i = 1; i < response.data.values.length; i++) {
      const [
        style_number,
        pattern_number,
        color,
        style_type,
        style_name,
        mrp,
        wash_care,
        accessory1,
        accessory2,
      ] = response.data.values[i];

      styles.push({
        style_number: Number(style_number),
        pattern_number,
        color,
        style_type,
        style_name,
        mrp: Number(mrp),
        wash_care,
        accessory1,
        accessory2,
      });
    }

    return styles;
  } catch (error) {
    console.error('Failed to fetch fabric data from google sheet :: ', error?.message);
    throw error;
  }
};

export { fetchstyleDetailsFromGoogleSheet };
