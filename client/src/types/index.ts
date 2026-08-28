export interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER_DUOC' | 'MANAGER_CNTT' | 'MANAGER_TCHC' | 'DEPARTMENT' | string;
  departmentId?: number;
  department?: Department;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  location: string;
  description?: string;
  _count?: { assets: number };
}

export interface AssetCategory {
  id: number;
  code: string;
  name: string;
  description?: string;
  _count?: { assets: number };
}

export type ManagingUnit = 'TCHC' | 'DUOC' | 'CNTT';

export interface Asset {
  id: number;
  assetCode: string;
  name: string;
  categoryId: number;
  category?: AssetCategory;
  departmentId: number;
  department?: Department;
  managingUnit?: ManagingUnit;
  floor?: string;
  buildingAsset?: number;
  location?: string;
  locationDetail?: string;
  assignedTo?: string;
  yearInUse?: number;
  originalPrice?: number;
  currentValue?: number;
  depreciationRate?: number;
  manufacturer?: string;
  countryOfOrigin?: string;
  specifications?: string;
  status: AssetStatus;
  bookQuantity: number;
  actualQuantity: number;
  quantityDifference: number;
  source?: string;
  fundingSource?: string;
  decisionNumber?: string;
  note?: string;
  qrCode?: string;
  transfers?: AssetTransfer[];
  maintenanceRequests?: MaintenanceRequest[];
  calibrations?: CalibrationRecord[];
  depreciations?: Depreciation[];
  createdAt: string;
  updatedAt: string;
}

export type AssetStatus = 'DANG_SU_DUNG' | 'HONG' | 'KHONG_SU_DUNG' | 'CHO_THANH_LY' | 'DA_THANH_LY' | 'BAO_TRI' | 'CHO_PHAN_BO';

export interface CommitteeMember {
  id: number;
  fullName: string;
  position: string;
  role: 'CHUTICH' | 'TOTRUONG_TBYT' | 'TOTRUONG_CNTT' | 'TOTRUONG_TCHC' | 'UYVIEN' | 'DAIDIEN_KHOA' | 'THANHVIEN' | 'THANHVIEN_DUOC' | 'THANHVIEN_CNTT' | 'THANHVIEN_TCHC' | string;
  departmentId?: number;
  scope?: string; // 'ALL', 'DUOC', 'CNTT', 'TCHC'
  isActive?: number;
  displayOrder?: number;
}

export interface AssetTransfer {
  id: number;
  assetId: number;
  asset?: Asset;
  fromDepartmentId: number;
  fromDepartment?: Department;
  toDepartmentId: number;
  toDepartment?: Department;
  transferDate: string;
  reason?: string;
  approvedBy?: string;
  note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
}

export interface MaintenanceRequest {
  id: number;
  assetId: number;
  asset?: Asset;
  requestedBy: string; // Tên người đề nghị
  contactPhone?: string; // Số điện thoại liên hệ
  departmentId: number;
  department?: Department;
  managingUnit?: 'DUOC' | 'CNTT' | 'TCHC' | string;
  locationDetail?: string; // Vị trí phòng máy cụ thể
  issueDescription: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  repairCost?: number;
  repairVendor?: string;
  repairNote?: string;
  technicianName?: string; // Tên cán bộ kỹ thuật tiếp nhận / xử lý
  fundingSource?: string; // Nguồn kinh phí (Thu sự nghiệp, Quỹ PTHĐSN, Ngân sách...)
  decisionNumber?: string; // Quyết định số 12/QĐ-TTKSBT, 34/QĐ-TTKSBT...
  maintenanceType?: string;
  servicePackage?: string;
  replacementParts?: string;
  acceptanceMembers?: string;
  deviceStatusAfter?: string;
  proposalDate?: string;
  approvalDate?: string;
  requestDate: string;
  completedDate?: string;
}

export interface InventorySession {
  id: number;
  name: string;
  decisionNumber?: string;
  fundingSource?: string;
  startDate: string;
  endDate?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  createdBy?: string;
  records?: InventoryRecord[];
  _count?: { records: number };
}

export interface InventoryRecord {
  id: number;
  sessionId: number;
  assetId: number;
  asset?: Asset;
  bookQuantity: number;
  actualQuantity: number;
  difference: number;
  condition?: string;
  note?: string;
  checkedBy?: string;
  checkedDate: string;
}

export interface Disposal {
  id: number;
  assetId: number;
  asset?: Asset;
  proposedDate: string;
  disposalDate?: string;
  reason: string;
  proposedBy?: string;
  approvedBy?: string;
  approvalDate?: string;
  disposalPrice?: number;
  status: 'PROPOSED' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  decisionNumber?: string;
  fundingSource?: string;
  campaignName?: string;
  technicalAssessment?: string;
  technicalInspector?: string;
  disposalMethod?: string;
  note?: string;
}

export interface Depreciation {
  id: number;
  assetId: number;
  asset?: Asset;
  year: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  remainingValue: number;
  calculatedDate: string;
}

export interface CalibrationRecord {
  id: number;
  assetId: number;
  asset?: Asset;
  calibrationDate: string;
  nextCalibrationDate?: string;
  performedBy?: string;
  vendor?: string;
  result: 'PASS' | 'FAIL' | 'CONDITIONAL';
  certificateNumber?: string;
  note?: string;
  serviceType?: 'HIEU_CHUAN' | 'KIEM_DINH' | 'THU_NGHIEM' | 'KIEM_XA' | string;
  servicePackage?: string;
  cost?: number;
  decisionNumber?: string;
  acceptanceMembers?: string;
  fundingSource?: string;
  deviceStatusAfter?: string;
  departmentLocation?: string;
  proposalDate?: string;
  approvalDate?: string;
}

export interface PlannedMaintenance {
  id: number;
  assetId: number;
  asset?: Asset;
  maintenanceDate: string;
  nextMaintenanceDate?: string;
  cycleMonths?: number;
  performedBy?: string;
  vendor?: string;
  planContent?: string;
  result: 'PASS' | 'FAIL' | 'PENDING' | 'NEEDS_REPAIR' | string;
  cost?: number;
  decisionNumber?: string;
  acceptanceMembers?: string;
  fundingSource?: string;
  deviceStatusAfter?: string;
  note?: string;
  createdAt?: string;
}

export interface DashboardStats {
  totalAssets: number;
  dangSuDung: number;
  baoTri: number;
  choPhanBo: number;
  daThanhLy: number;
  totalValue: number;
}

export const STATUS_LABELS: Record<AssetStatus, string> = {
  DANG_SU_DUNG: 'Đang sử dụng',
  HONG: 'Hỏng',
  KHONG_SU_DUNG: 'Không sử dụng',
  CHO_THANH_LY: 'Chờ thanh lý',
  DA_THANH_LY: 'Đã thanh lý',
  BAO_TRI: 'Bảo trì / Sửa chữa',
  CHO_PHAN_BO: 'Chờ phân bổ',
};

export const STATUS_COLORS: Record<AssetStatus, string> = {
  DANG_SU_DUNG: 'bg-green-100 text-green-800',
  HONG: 'bg-red-100 text-red-800',
  KHONG_SU_DUNG: 'bg-gray-100 text-gray-800',
  CHO_THANH_LY: 'bg-yellow-100 text-yellow-800',
  DA_THANH_LY: 'bg-gray-200 text-gray-600',
  BAO_TRI: 'bg-orange-100 text-orange-800',
  CHO_PHAN_BO: 'bg-blue-100 text-blue-800',
};

export const MANAGING_UNIT_LABELS: Record<ManagingUnit, string> = {
  DUOC: 'Khoa Dược (Trang thiết bị Y tế)',
  CNTT: 'Tổ CNTT (Thiết bị Công nghệ thông tin)',
  TCHC: 'Phòng TCHC (Hành chính & Hạ tầng tòa nhà)',
};

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp',
};
