import * as XLSX from 'xlsx';

/**
 * Export logs to Excel with branded formatting
 */
export const exportLogsToExcel = (logs, filters = {}) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Get current date/time
  const exportDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Create header information
  const headerData = [
    ['DeployX System Logs Report'],
    [''],
    ['Export Date:', exportDate],
    ['Total Records:', logs.length],
    [''],
  ];
  
  // Add filter information if any
  if (filters.log_type) {
    headerData.push(['Filter - Type:', formatLogType(filters.log_type)]);
  }
  if (filters.status) {
    headerData.push(['Filter - Status:', filters.status]);
  }
  if (filters.date_from) {
    headerData.push(['Filter - Date From:', new Date(filters.date_from).toLocaleString()]);
  }
  if (filters.date_to) {
    headerData.push(['Filter - Date To:', new Date(filters.date_to).toLocaleString()]);
  }
  if (filters.search) {
    headerData.push(['Filter - Search:', filters.search]);
  }
  
  headerData.push(['']); // Empty row before table
  
  // Define column headers
  const columnHeaders = [
    'Log ID',
    'Type',
    'Title',
    'Status',
    'Created At',
    'Completed At',
    'Duration',
    'Initiated By',
    'Target Type',
    'Total Targets',
    'Success Count',
    'Failure Count',
    'Success Rate',
    'Details'
  ];
  
  // Convert logs to table data
  const tableData = logs.map(log => {
    const createdAt = new Date(log.created_at);
    const completedAt = log.completed_at ? new Date(log.completed_at) : null;
    const duration = completedAt ? calculateDuration(createdAt, completedAt) : 'In Progress';
    const successRate = log.target_count > 0 
      ? `${((log.success_count / log.target_count) * 100).toFixed(1)}%` 
      : 'N/A';
    
    return [
      log.id,
      formatLogType(log.log_type),
      log.title,
      log.status.toUpperCase(),
      createdAt.toLocaleString(),
      completedAt ? completedAt.toLocaleString() : 'N/A',
      duration,
      log.initiated_by || 'System',
      log.target_type || 'N/A',
      log.target_count,
      log.success_count,
      log.failure_count,
      successRate,
      JSON.stringify(log.details)
    ];
  });
  
  // Combine all data
  const worksheetData = [...headerData, columnHeaders, ...tableData];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 },  // Log ID
    { wch: 20 },  // Type
    { wch: 35 },  // Title
    { wch: 12 },  // Status
    { wch: 20 },  // Created At
    { wch: 20 },  // Completed At
    { wch: 15 },  // Duration
    { wch: 20 },  // Initiated By
    { wch: 15 },  // Target Type
    { wch: 12 },  // Total Targets
    { wch: 12 },  // Success Count
    { wch: 12 },  // Failure Count
    { wch: 12 },  // Success Rate
    { wch: 40 }   // Details
  ];
  
  // Style the header rows
  const headerRowIndex = headerData.length - 1; // Index of column headers row
  
  // Apply styles to title row
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: "0066CC" } },
      alignment: { horizontal: "left", vertical: "center" }
    };
  }
  
  // Apply styles to info rows
  for (let i = 2; i < headerData.length - 1; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: i, c: 0 });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true },
        alignment: { horizontal: "left" }
      };
    }
  }
  
  // Apply styles to column headers
  for (let i = 0; i < columnHeaders.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: i });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0066CC" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
  }
  
  // Apply alternating row colors to data rows
  for (let i = 0; i < tableData.length; i++) {
    const rowIndex = headerRowIndex + 1 + i;
    for (let j = 0; j < columnHeaders.length; j++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: j });
      if (ws[cellRef]) {
        ws[cellRef].s = {
          fill: { fgColor: { rgb: i % 2 === 0 ? "F0F0F0" : "FFFFFF" } },
          alignment: { vertical: "top", wrapText: j === columnHeaders.length - 1 } // Wrap text for Details column
        };
        
        // Apply status-based coloring
        if (j === 3) { // Status column
          const status = tableData[i][3].toLowerCase();
          if (status.includes('completed') || status.includes('success')) {
            ws[cellRef].s.fill = { fgColor: { rgb: "D4EDDA" } };
            ws[cellRef].s.font = { color: { rgb: "155724" } };
          } else if (status.includes('failed') || status.includes('error')) {
            ws[cellRef].s.fill = { fgColor: { rgb: "F8D7DA" } };
            ws[cellRef].s.font = { color: { rgb: "721C24" } };
          } else if (status.includes('running') || status.includes('progress')) {
            ws[cellRef].s.fill = { fgColor: { rgb: "D1ECF1" } };
            ws[cellRef].s.font = { color: { rgb: "0C5460" } };
          } else if (status.includes('pending')) {
            ws[cellRef].s.fill = { fgColor: { rgb: "FFF3CD" } };
            ws[cellRef].s.font = { color: { rgb: "856404" } };
          }
        }
      }
    }
  }
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, 'System Logs');
  
  // Generate filename
  const filename = `DeployX_Logs_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
  
  // Write the file
  XLSX.writeFile(wb, filename);
  
  return filename;
};

/**
 * Format log type for display
 */
const formatLogType = (type) => {
  const typeMap = {
    software_deployment: 'Software Deployment',
    file_deployment: 'File Deployment',
    command_execution: 'Command Execution',
    scheduled_task: 'Scheduled Task'
  };
  return typeMap[type] || type;
};

/**
 * Calculate duration between two dates
 */
const calculateDuration = (startDate, endDate) => {
  const diffMs = endDate - startDate;
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

/**
 * Export statistics summary to Excel
 */
export const exportStatsToExcel = (stats) => {
  const wb = XLSX.utils.book_new();
  
  const exportDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Create summary data
  const summaryData = [
    ['DeployX System Statistics Report'],
    [''],
    ['Export Date:', exportDate],
    [''],
    ['Overall Statistics'],
    ['Metric', 'Value'],
    ['Total Software Deployments', stats.total_deployments],
    ['Total File Deployments', stats.total_executions],
    ['Total Scheduled Tasks', stats.total_scheduled],
    ['Overall Success Rate', `${stats.success_rate}%`],
    ['Last 24 Hours Activity', stats.last_24h_count],
    [''],
    ['By Type'],
    ['Type', 'Count'],
    ['Software Deployments', stats.by_type.software_deployment || 0],
    ['File Deployments', stats.by_type.file_deployment || 0],
    ['Scheduled Tasks', stats.by_type.scheduled_task || 0],
    [''],
    ['By Status'],
    ['Status', 'Count'],
    ['Pending', stats.by_status.pending || 0],
    ['Running', stats.by_status.running || 0],
    ['Completed', stats.by_status.completed || 0],
    ['Failed', stats.by_status.failed || 0],
    ['Cancelled', stats.by_status.cancelled || 0]
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(summaryData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 35 },
    { wch: 20 }
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Statistics');
  
  const filename = `DeployX_Statistics_${new Date().toISOString().split('T')[0]}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
  
  return filename;
};
