// モックデータ（Firebase未接続時に使用）

export const mockClients = [
  {
    id: 'client-1',
    clientCode: 'KMT001',
    clientName: '株式会社サンプルホテル',
    representativeName: '山田太郎',
    address: '熊本県熊本市中央区1-1-1',
    phone: '096-000-0001',
    email: 'info@sample-hotel.example.com',
    notes: '',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
  },
  {
    id: 'client-2',
    clientCode: 'KMT002',
    clientName: '合同会社テスト旅館',
    representativeName: '鈴木花子',
    address: '熊本県熊本市東区2-2-2',
    phone: '096-000-0002',
    email: 'info@test-ryokan.example.com',
    notes: '',
    isActive: true,
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05')
  }
]

export const mockFacilities = [
  {
    id: 'facility-1',
    clientId: 'client-1',
    facilityCode: 'F001',
    facilityName: 'サンプルホテル本館',
    roomCodePrefix: 'AB',
    address: '熊本県熊本市中央区1-1-1',
    phone: '096-000-0001',
    capacity: 50,
    notes: '',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
  },
  {
    id: 'facility-2',
    clientId: 'client-1',
    facilityCode: 'F002',
    facilityName: 'サンプルホテル別館',
    roomCodePrefix: 'CD',
    address: '熊本県熊本市中央区1-1-2',
    phone: '096-000-0003',
    capacity: 30,
    notes: '',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01')
  },
  {
    id: 'facility-3',
    clientId: 'client-2',
    facilityCode: 'F003',
    facilityName: 'テスト旅館',
    roomCodePrefix: 'EF',
    address: '熊本県熊本市東区2-2-2',
    phone: '096-000-0002',
    capacity: 20,
    notes: '',
    isActive: true,
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05')
  }
]

export const mockRooms = [
  { id: 'room-1', facilityId: 'facility-1', roomCode: 'AB101', roomName: '101号室', capacity: 2, isActive: true },
  { id: 'room-2', facilityId: 'facility-1', roomCode: 'AB102', roomName: '102号室', capacity: 3, isActive: true },
  { id: 'room-3', facilityId: 'facility-1', roomCode: 'AB201', roomName: '201号室', capacity: 4, isActive: true },
  { id: 'room-4', facilityId: 'facility-2', roomCode: 'CD101', roomName: '別館101', capacity: 2, isActive: true },
  { id: 'room-5', facilityId: 'facility-2', roomCode: 'CD102', roomName: '別館102', capacity: 2, isActive: true },
  { id: 'room-6', facilityId: 'facility-3', roomCode: 'EF101', roomName: '松の間', capacity: 4, isActive: true },
  { id: 'room-7', facilityId: 'facility-3', roomCode: 'EF102', roomName: '竹の間', capacity: 3, isActive: true },
]

export const mockLodgingRecords = [
  {
    id: 'rec-1', clientId: 'client-1', facilityId: 'facility-1', roomCode: 'AB101',
    checkInDate: '2026-01-10', checkOutDate: '2026-01-12', nights: 2,
    adults: 2, children: 0, infants: 0, taxablePersons: 2, taxAmount: 800,
    yearMonth: '2026-01', importLogId: 'log-1', createdAt: new Date('2026-01-15')
  },
  {
    id: 'rec-2', clientId: 'client-1', facilityId: 'facility-1', roomCode: 'AB102',
    checkInDate: '2026-01-11', checkOutDate: '2026-01-13', nights: 2,
    adults: 2, children: 1, infants: 1, taxablePersons: 3, taxAmount: 1200,
    yearMonth: '2026-01', importLogId: 'log-1', createdAt: new Date('2026-01-15')
  },
  {
    id: 'rec-3', clientId: 'client-1', facilityId: 'facility-2', roomCode: 'CD101',
    checkInDate: '2026-01-15', checkOutDate: '2026-01-16', nights: 1,
    adults: 1, children: 0, infants: 0, taxablePersons: 1, taxAmount: 200,
    yearMonth: '2026-01', importLogId: 'log-1', createdAt: new Date('2026-01-20')
  },
  {
    id: 'rec-4', clientId: 'client-1', facilityId: 'facility-1', roomCode: 'AB201',
    checkInDate: '2026-02-01', checkOutDate: '2026-02-03', nights: 2,
    adults: 3, children: 1, infants: 0, taxablePersons: 4, taxAmount: 1600,
    yearMonth: '2026-02', importLogId: 'log-2', createdAt: new Date('2026-02-05')
  },
]

export const mockSummaries = [
  {
    id: 'sum-1', clientId: 'client-1', facilityId: 'facility-1',
    periodType: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31',
    yearMonth: '2026-01', totalRecords: 2, totalNights: 4,
    totalAdults: 4, totalChildren: 1, totalInfants: 1,
    taxablePersonNights: 10, taxAmount: 2000,
    status: 'confirmed', createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01'),
    createdBy: 'user-1'
  },
  {
    id: 'sum-2', clientId: 'client-1', facilityId: 'facility-2',
    periodType: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31',
    yearMonth: '2026-01', totalRecords: 1, totalNights: 1,
    totalAdults: 1, totalChildren: 0, totalInfants: 0,
    taxablePersonNights: 1, taxAmount: 200,
    status: 'draft', createdAt: new Date('2026-02-01'), updatedAt: new Date('2026-02-01'),
    createdBy: 'user-1'
  },
]

export const mockImportLogs = [
  {
    id: 'log-1', clientId: 'client-1', facilityIds: ['facility-1', 'facility-2'],
    fileName: 'bookings_202601.csv', fileSize: 12345, totalRows: 3,
    successRows: 3, errorRows: 0, periodStart: '2026-01-10', periodEnd: '2026-01-16',
    status: 'completed', createdAt: new Date('2026-01-20'), createdBy: 'user-1'
  },
  {
    id: 'log-2', clientId: 'client-1', facilityIds: ['facility-1'],
    fileName: 'bookings_202602.csv', fileSize: 5432, totalRows: 1,
    successRows: 1, errorRows: 0, periodStart: '2026-02-01', periodEnd: '2026-02-03',
    status: 'completed', createdAt: new Date('2026-02-05'), createdBy: 'user-1'
  },
]

export const mockExportLogs = [
  {
    id: 'exp-1', clientId: 'client-1', facilityId: 'facility-1', summaryId: 'sum-1',
    periodType: 'monthly', periodStart: '2026-01-01', periodEnd: '2026-01-31',
    fileName: 'eLTAX_202601_F001.csv', taxAmount: 2000,
    createdAt: new Date('2026-02-03'), createdBy: 'user-1', downloadCount: 1
  },
]
