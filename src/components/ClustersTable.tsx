import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Paper,
  SelectChangeEvent,
  Tooltip,
  CircularProgress,
  Chip,
  Fade,
  Zoom,
  Typography,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LabelIcon from '@mui/icons-material/Label';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { Plus, CloudOff, Filter, Tag, Tags } from 'lucide-react';
import CreateOptions from './ImportClusters'; // Dialog for cluster import (if needed)
import useTheme from '../stores/themeStore';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import { toast } from 'react-hot-toast';
import InboxIcon from '@mui/icons-material/Inbox';
import PostAddIcon from '@mui/icons-material/PostAdd';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TableSkeleton from './ui/TableSkeleton';
import ClusterDetailDialog from './ClusterDetailDialog'; // Import the new component
import DetachmentLogsDialog from './DetachmentLogsDialog'; // Import the new component

interface ManagedClusterInfo {
  name: string;
  uid?: string;
  labels: { [key: string]: string };
  creationTime?: string;
  creationTimestamp?: string;
  status?: string;
  context: string;
  available?: boolean;
  joined?: boolean;
}

interface ClustersTableProps {
  clusters: ManagedClusterInfo[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  initialShowCreateOptions?: boolean;
  initialActiveOption?: string;
}

// Add a new ColorTheme interface before the LabelEditDialogProps interface
interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  white: string;
  background: string;
  paper: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  disabled: string;
}

interface LabelEditDialogProps {
  open: boolean;
  onClose: () => void;
  cluster: ManagedClusterInfo | null;
  onSave: (clusterName: string, contextName: string, labels: { [key: string]: string }) => void;
  isDark: boolean;
  colors: ColorTheme;
}

const LabelEditDialog: React.FC<LabelEditDialogProps> = ({
  open,
  onClose,
  cluster,
  onSave,
  isDark,
  colors,
}) => {
  const [labels, setLabels] = useState<Array<{ key: string; value: string }>>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [labelSearch, setLabelSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState<number | null>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // Filter labels based on search
  const filteredLabels =
    labelSearch.trim() === ''
      ? labels
      : labels.filter(
          label =>
            label.key.toLowerCase().includes(labelSearch.toLowerCase()) ||
            label.value.toLowerCase().includes(labelSearch.toLowerCase())
        );

  useEffect(() => {
    if (cluster && open) {
      // Convert labels object to array format for editing
      const labelArray = Object.entries(cluster.labels || {}).map(([key, value]) => ({
        key,
        value,
      }));
      setLabels(labelArray);

      // Reset other states
      setNewKey('');
      setNewValue('');
      setLabelSearch('');
      setIsSearching(false);
      setSelectedLabelIndex(null);

      // Focus key input after a short delay
      setTimeout(() => {
        if (keyInputRef.current) {
          keyInputRef.current.focus();
        }
      }, 100);
    }
  }, [cluster, open]);

  const handleAddLabel = () => {
    if (newKey.trim() && newValue.trim()) {
      // Check for duplicates
      const isDuplicate = labels.some(label => label.key === newKey.trim());

      if (isDuplicate) {
        // Update existing label with same key
        setLabels(
          labels.map(label =>
            label.key === newKey.trim() ? { ...label, value: newValue.trim() } : label
          )
        );
        toast.success(`Updated existing label: ${newKey}`);
      } else {
        // Add new label with animation effect
        setLabels(prev => [...prev, { key: newKey.trim(), value: newValue.trim() }]);
        toast.success(`Added new label: ${newKey}`);
      }

      // Clear inputs and refocus key input
      setNewKey('');
      setNewValue('');
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (newKey && !newValue && valueInputRef.current) {
        // If key is entered but value is empty, move focus to value input
        valueInputRef.current.focus();
      } else if (newKey && newValue) {
        // If both fields are filled, add the label
        handleAddLabel();
      }
    } else if (e.key === 'Escape') {
      // Clear both inputs on Escape
      setNewKey('');
      setNewValue('');
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleRemoveLabel = (index: number) => {
    const labelToRemove = labels[index];
    setLabels(labels.filter((_, i) => i !== index));
    toast.success(`Removed label: ${labelToRemove.key}`);
  };

  const handleSave = () => {
    if (!cluster) return;

    setSaving(true);

    // Convert array back to object format
    const labelObject: { [key: string]: string } = {};
    labels.forEach(({ key, value }) => {
      labelObject[key] = value;
    });

    // Add a slight delay to show loading state
    setTimeout(() => {
      onSave(cluster.name, cluster.context, labelObject);
      setSaving(false);
      onClose();
    }, 300);
  };

  const toggleSearchMode = () => {
    setIsSearching(!isSearching);
    if (!isSearching) {
      setTimeout(() => {
        const searchInput = document.getElementById('label-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    } else {
      setLabelSearch('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <DialogTitle
        style={{
          color: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <LabelIcon style={{ color: colors.primary }} />
          <Typography variant="h6" component="span">
            Edit Labels for <span style={{ fontWeight: 'bold' }}>{cluster?.name}</span>
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: '24px' }}>
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <Typography variant="body2" style={{ color: colors.textSecondary }}>
              Add or remove labels to organize and categorize your cluster.
            </Typography>

            <div className="flex gap-2">
              <Tooltip title={isSearching ? 'Exit search' : 'Search labels'}>
                <IconButton
                  size="small"
                  onClick={toggleSearchMode}
                  style={{
                    color: isSearching ? colors.primary : colors.textSecondary,
                    backgroundColor: isSearching
                      ? isDark
                        ? 'rgba(47, 134, 255, 0.15)'
                        : 'rgba(47, 134, 255, 0.1)'
                      : 'transparent',
                  }}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {labels.length > 0 && (
                <Chip
                  size="small"
                  label={`${labels.length} label${labels.length !== 1 ? 's' : ''}`}
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.15)'
                      : 'rgba(47, 134, 255, 0.1)',
                    color: colors.primary,
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </div>
          </div>

          <Fade in={isSearching} mountOnEnter unmountOnExit>
            <div className="mb-4">
              <TextField
                id="label-search-input"
                placeholder="Search labels..."
                value={labelSearch}
                onChange={e => setLabelSearch(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                autoFocus
                InputProps={{
                  style: { color: colors.text },
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: colors.primary, fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: labelSearch && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setLabelSearch('')}
                        style={{ color: colors.textSecondary }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: colors.primaryLight },
                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                  },
                }}
              />
            </div>
          </Fade>

          <Fade in={!isSearching}>
            <div className="mb-5">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                <TextField
                  label="Label Key"
                  placeholder="e.g. environment"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  inputRef={keyInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text },
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primaryLight },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                  }}
                />
                <TextField
                  label="Label Value"
                  placeholder="e.g. production"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  inputRef={valueInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text },
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primaryLight },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                  }}
                />
                <Button
                  onClick={handleAddLabel}
                  variant="contained"
                  disabled={!newKey.trim() || !newValue.trim()}
                  startIcon={<AddIcon />}
                  style={{
                    backgroundColor:
                      !newKey.trim() || !newValue.trim() ? colors.disabled : colors.primary,
                    color: colors.white,
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Add
                </Button>
              </div>
              <Typography variant="caption" style={{ color: colors.textSecondary }}>
                Tip: Press{' '}
                <span
                  style={{
                    fontFamily: 'monospace',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    padding: '1px 4px',
                    borderRadius: '2px',
                  }}
                >
                  Enter
                </span>{' '}
                to move between fields or add a label
              </Typography>
            </div>
          </Fade>

          <Divider style={{ backgroundColor: colors.border, margin: '16px 0' }} />

          <div className="max-h-60 overflow-y-auto pr-1">
            {filteredLabels.length > 0 ? (
              <div className="space-y-2">
                {filteredLabels.map((label, index) => (
                  <Zoom
                    in={true}
                    style={{ transitionDelay: `${index * 25}ms` }}
                    key={`${label.key}-${index}`}
                  >
                    <div
                      className={`flex items-center justify-between gap-2 rounded p-2 transition-all duration-200 ${selectedLabelIndex === index ? 'ring-1' : ''}`}
                      style={{
                        backgroundColor:
                          selectedLabelIndex === index
                            ? isDark
                              ? 'rgba(47, 134, 255, 0.2)'
                              : 'rgba(47, 134, 255, 0.1)'
                            : isDark
                              ? 'rgba(47, 134, 255, 0.1)'
                              : 'rgba(47, 134, 255, 0.05)',
                        border: `1px solid ${selectedLabelIndex === index ? colors.primary : colors.border}`,
                        boxShadow:
                          selectedLabelIndex === index
                            ? isDark
                              ? '0 0 0 1px rgba(47, 134, 255, 0.4)'
                              : '0 0 0 1px rgba(47, 134, 255, 0.2)'
                            : 'none',
                        cursor: 'default',
                      }}
                      onClick={() =>
                        setSelectedLabelIndex(selectedLabelIndex === index ? null : index)
                      }
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={16} style={{ color: colors.primary }} />
                        <span style={{ color: colors.text }}>
                          <span style={{ fontWeight: 500 }}>{label.key}</span>
                          <span style={{ color: colors.textSecondary }}> = </span>
                          <span>{label.value}</span>
                        </span>
                      </div>
                      <Tooltip title="Remove Label">
                        <IconButton
                          size="small"
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveLabel(
                              labels.findIndex(l => l.key === label.key && l.value === label.value)
                            );
                          }}
                          style={{
                            color:
                              selectedLabelIndex === index ? colors.primary : colors.textSecondary,
                            opacity: 0.8,
                            transition: 'all 0.2s ease',
                          }}
                          className="hover:opacity-100"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </Zoom>
                ))}
              </div>
            ) : (
              <div className="mt-2 flex flex-col items-center justify-center p-6 text-center">
                <Tags size={28} style={{ color: colors.textSecondary, marginBottom: '12px' }} />
                <Typography
                  variant="body2"
                  style={{ color: colors.text, fontWeight: 500, marginBottom: '4px' }}
                >
                  {labelSearch ? 'No matching labels found' : 'No labels added yet'}
                </Typography>
                <Typography
                  variant="caption"
                  style={{ color: colors.textSecondary, maxWidth: '300px', margin: '0 auto' }}
                >
                  {labelSearch
                    ? 'Try a different search term or clear the search'
                    : 'Add your first label using the fields above to help organize this cluster.'}
                </Typography>

                {labelSearch && (
                  <Button
                    size="small"
                    variant="text"
                    style={{ color: colors.primary, marginTop: '12px' }}
                    onClick={() => setLabelSearch('')}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onClose}
          style={{
            color: colors.textSecondary,
          }}
          variant="text"
          startIcon={<CloseIcon />}
          disabled={saving}
        >
          Cancel
        </Button>

        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          style={{
            backgroundColor: colors.primary,
            color: colors.white,
            minWidth: '120px',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
interface DetachClusterDialogProps {
  open: boolean;
  onClose: () => void;
  cluster: ManagedClusterInfo | null;
  onDetach: (clusterName: string) => void;
  isLoading: boolean;
  isDark: boolean;
  colors: ColorTheme;
}

const DetachClusterDialog: React.FC<DetachClusterDialogProps> = ({
  open,
  onClose,
  cluster,
  onDetach,
  isLoading,
  isDark,
  colors,
}) => {
  const handleDetach = () => {
    if (cluster) {
      onDetach(cluster.name);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <DialogTitle
        style={{
          color: colors.error,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <LinkOffIcon style={{ color: colors.error }} />
          <Typography variant="h6" component="span">
            Detach Cluster
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: '24px' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" style={{ fontWeight: 500, marginBottom: '8px' }}>
            Are you sure you want to detach the following cluster?
          </Typography>

          <Box
            sx={{
              p: 2,
              mt: 2,
              border: `1px solid ${colors.border}`,
              borderRadius: 1,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <Typography variant="h6" style={{ color: colors.text, fontWeight: 600 }}>
              {cluster?.name}
            </Typography>
            <Typography variant="body2" style={{ color: colors.textSecondary, marginTop: '8px' }}>
              Context: {cluster?.name}
            </Typography>
            {cluster?.labels && Object.keys(cluster.labels).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" style={{ color: colors.textSecondary }}>
                  Labels:
                </Typography>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(cluster.labels).map(([key, value]) => (
                    <Chip
                      key={key}
                      size="small"
                      label={`${key}=${value}`}
                      sx={{
                        backgroundColor: isDark
                          ? 'rgba(47, 134, 255, 0.15)'
                          : 'rgba(47, 134, 255, 0.08)',
                        color: colors.primary,
                        fontSize: '0.75rem',
                      }}
                    />
                  ))}
                </div>
              </Box>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            mt: 3,
            backgroundColor: isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)',
            p: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" style={{ color: colors.error }}>
            Warning: This action will remove the cluster from management. It will no longer be
            visible or controlled from this interface.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onClose}
          style={{
            color: colors.textSecondary,
          }}
          variant="text"
          startIcon={<CloseIcon />}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <Button
          onClick={handleDetach}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <LinkOffIcon />}
          style={{
            backgroundColor: colors.error,
            color: colors.white,
            minWidth: '120px',
          }}
        >
          {isLoading ? 'Detaching...' : 'Detach Cluster'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ClustersTable: React.FC<ClustersTableProps> = ({
  clusters,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  initialShowCreateOptions = false,
  initialActiveOption = 'option1',
}) => {
  const [query, setQuery] = useState('');
  const [filteredClusters, setFilteredClusters] = useState<ManagedClusterInfo[]>(clusters);
  const [filter, setFilter] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [showCreateOptions, setShowCreateOptions] = useState(initialShowCreateOptions);
  const [activeOption, setActiveOption] = useState<string | null>(initialActiveOption);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ManagedClusterInfo | null>(null);
  const [loadingClusterEdit, setLoadingClusterEdit] = useState<string | null>(null);
  const [filterByLabel, setFilterByLabel] = useState<{ key: string; value: string } | null>(null);
  const [bulkLabelsAnchorEl, setBulkLabelsAnchorEl] = useState<null | HTMLElement>(null);
  const bulkLabelsMenuOpen = Boolean(bulkLabelsAnchorEl);
  const hasSelectedClusters = selectedClusters.length > 0;
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';
  const [anchorElActions, setAnchorElActions] = useState<{ [key: string]: HTMLElement | null }>({});
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [detachClusterOpen, setDetachClusterOpen] = useState(false);
  const [detachLogsOpen, setDetachLogsOpen] = useState(false);
  const [loadingClusterDetach, setLoadingClusterDetach] = useState<string | null>(null);
  const [refetchClusters] = useState<(() => void) | null>(null);

  const { useUpdateClusterLabels, useDetachCluster } = useClusterQueries();
  const updateLabelsMutation = useUpdateClusterLabels();
  const detachClusterMutation = useDetachCluster();

  // Initialize with initial props if provided
  useEffect(() => {
    if (initialShowCreateOptions) {
      setShowCreateOptions(true);
      // Set the active option to "kubeconfig" for import dialog
      setActiveOption(initialActiveOption);
    }
  }, [initialShowCreateOptions, initialActiveOption]);

  // Add useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: ReactKeyboardEvent) => {
      // Only handle shortcuts when no dialogs are open
      if (editDialogOpen || showCreateOptions) return;

      // Ctrl+F or / to focus search
      if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder="Search by name, label, or context"]'
        ) as HTMLInputElement;
        if (searchInput) searchInput.focus();
      }

      // Escape to clear search and filters
      if (e.key === 'Escape') {
        if (query) setQuery('');
        if (filter) setFilter('');
        if (filterByLabel) setFilterByLabel(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown as unknown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
  }, [editDialogOpen, showCreateOptions, query, filter, filterByLabel]);

  // Add function to handle filtering by clicking on a label
  const handleFilterByLabel = (key: string, value: string) => {
    // If clicking the same label filter, remove it
    if (filterByLabel?.key === key && filterByLabel?.value === value) {
      setFilterByLabel(null);
      // Show a message to the user
      toast.success('Label filter removed', { duration: 2000 });
    } else {
      setFilterByLabel({ key, value });
      // Show a message to the user
      toast.success(`Filtering by label: ${key}=${value}`, { duration: 2000 });
    }
  };

  // Add bulk operation functions
  const handleBulkLabelsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setBulkLabelsAnchorEl(event.currentTarget);
  };

  const handleBulkLabelsClose = () => {
    setBulkLabelsAnchorEl(null);
  };

  const handleBulkAddLabels = () => {
    if (!hasSelectedClusters) return;

    // Get the first selected cluster to prefill dialog
    const firstCluster = clusters.find(c => selectedClusters.includes(c.name));
    if (firstCluster) {
      setSelectedCluster({
        ...firstCluster,
        name: `${selectedClusters.length} selected clusters`,
        // Don't pass labels initially
        labels: {},
      });
      setEditDialogOpen(true);
    }

    handleBulkLabelsClose();
  };

  useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  const filterClusters = useCallback(() => {
    let result = [...clusters];

    // Apply search query filter
    if (query.trim()) {
      result = result.filter(cluster => {
        const searchLower = query.toLowerCase().trim();
        const nameMatch = cluster.name.toLowerCase().includes(searchLower);
        const labelMatch = Object.entries(cluster.labels || {}).some(
          ([key, value]) =>
            key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)
        );
        const contextMatch = cluster.context.toLowerCase().includes(searchLower);
        return nameMatch || labelMatch || contextMatch;
      });
    }

    // Apply status filter
    if (filter && filter !== 'All') {
      result = result.filter(cluster => {
        const currentStatus = cluster.status || 'Active';
        return currentStatus.toLowerCase() === filter.toLowerCase();
      });
    }

    // Apply label filter
    if (filterByLabel) {
      result = result.filter(cluster => {
        const { key, value } = filterByLabel;
        return cluster.labels && cluster.labels[key] === value;
      });
    }

    setFilteredClusters(result);
  }, [clusters, query, filter, filterByLabel]);

  useEffect(() => {
    filterClusters();
  }, [filterClusters, query, filter, clusters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setFilter(event.target.value as string);
  };

  const handleCheckboxChange = (clusterName: string) => {
    setSelectedClusters(prev =>
      prev.includes(clusterName)
        ? prev.filter(name => name !== clusterName)
        : [...prev, clusterName]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClusters([]);
    } else {
      setSelectedClusters(filteredClusters.map(cluster => cluster.name));
    }
    setSelectAll(!selectAll);
  };

  const handleCancel = () => {
    setShowCreateOptions(false);
  };

  const handleEditLabels = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    setEditDialogOpen(true);
  };

  // Function to get the actual context to use for a cluster
  const getClusterContext = (cluster: ManagedClusterInfo): string => {
    return cluster.context || 'its1';
  };

  const handleSaveLabels = (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string }
  ) => {
    // Check if this is a bulk operation
    const isBulkOperation =
      selectedClusters.length > 1 && clusterName.includes('selected clusters');

    if (isBulkOperation) {
      // Set loading for bulk operation
      setLoadingClusterEdit('bulk');

      // Process all selected clusters sequentially with a longer delay
      let successCount = 0;
      let failureCount = 0;

      // Sequential processing with promises to ensure one request completes before starting the next
      const processNextCluster = async (index = 0) => {
        if (index >= selectedClusters.length) {
          // All clusters processed
          setLoadingClusterEdit(null);
          setEditDialogOpen(false);

          if (failureCount === 0) {
            toast.success(`Labels updated for ${successCount} clusters`, {
              icon: '🏷️',
              style: {
                borderRadius: '10px',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#1e293b',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              },
            });
          } else {
            toast.error(
              `Updated ${successCount} clusters, failed to update ${failureCount} clusters`,
              {
                icon: '⚠️',
                style: {
                  borderRadius: '10px',
                  background: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#f1f5f9' : '#1e293b',
                  border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                },
                duration: 5000,
              }
            );
          }
          return;
        }

        const name = selectedClusters[index];
        const cluster = clusters.find(c => c.name === name);
        if (!cluster) {
          // Skip invalid cluster
          processNextCluster(index + 1);
          return;
        }

        // Apply labels on top of existing labels (don't replace)
        const newLabels = { ...cluster.labels, ...labels };

        try {
          // Wait for mutation to complete before proceeding to next cluster
          await new Promise(resolve => {
            updateLabelsMutation.mutate(
              {
                contextName: getClusterContext(cluster), // Get correct context
                clusterName: cluster.name,
                labels: newLabels,
              },
              {
                onSuccess: () => {
                  successCount++;
                  resolve(undefined);
                },
                onError: error => {
                  console.error(`Error updating labels for cluster ${cluster.name}:`, error);
                  failureCount++;
                  resolve(undefined);
                },
              }
            );
          });

          // Add a delay between requests to reduce server load
          await new Promise(resolve => setTimeout(resolve, 800));

          // Process next cluster
          processNextCluster(index + 1);
        } catch (err) {
          console.error('Unexpected error during label update:', err);
          failureCount++;
          processNextCluster(index + 1);
        }
      };

      // Start processing
      processNextCluster();

      return;
    }

    // Regular single-cluster operation
    setLoadingClusterEdit(clusterName);

    // Find the actual cluster to get the correct context
    const actualCluster = clusters.find(c => c.name === clusterName);
    const actualContext = actualCluster ? getClusterContext(actualCluster) : contextName;

    // Log the operation
    console.log(
      `Updating labels for cluster "${clusterName}" with context "${actualContext}"`,
      labels
    );

    updateLabelsMutation.mutate(
      {
        contextName: actualContext,
        clusterName: clusterName,
        labels,
      },
      {
        onSuccess: () => {
          toast.success('Labels updated successfully', {
            icon: '🏷️',
            style: {
              borderRadius: '10px',
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            },
          });
          setLoadingClusterEdit(null);
          setEditDialogOpen(false);
        },
        onError: error => {
          toast.error(
            'Failed to update labels: ' +
              (error instanceof Error ? error.message : 'Unknown error'),
            {
              icon: '❌',
              style: {
                borderRadius: '10px',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#1e293b',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              },
              duration: 5000,
            }
          );
          console.error('Error updating cluster labels:', error);
          setLoadingClusterEdit(null);
        },
      }
    );
  };

  const handleActionsClick = (event: React.MouseEvent<HTMLButtonElement>, clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: event.currentTarget }));
  };

  const handleActionsClose = (clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: null }));
  };

  const handleViewDetails = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setViewDetailsOpen(true);
  };

  const handleCopyName = (clusterName: string) => {
    navigator.clipboard.writeText(clusterName);
    handleActionsClose(clusterName);
    toast.success(`Cluster name copied to clipboard: ${clusterName}`, {
      duration: 2000,
    });
  };

  const handleDetachCluster = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setDetachClusterOpen(true);
  };

  const handleConfirmDetach = (clusterName: string) => {
    setLoadingClusterDetach(clusterName);

    // Close the confirmation dialog and open logs dialog immediately
    setDetachClusterOpen(false);
    setDetachLogsOpen(true);

    detachClusterMutation.mutate(clusterName, {
      onSuccess: () => {
        setLoadingClusterDetach(null);

        // Explicitly refetch clusters data
        if (refetchClusters) {
          refetchClusters();
        } else {
          // Fallback if refetch function is not available
          window.location.reload();
        }

        // Remove the detached cluster from selected clusters if it was selected
        setSelectedClusters(prev => prev.filter(name => name !== clusterName));
      },
      onError: () => {
        setLoadingClusterDetach(null);
      },
    });
  };

  // Handle the closing of detachment logs dialog
  const handleCloseDetachLogs = () => {
    setDetachLogsOpen(false);
    // Refetch clusters to ensure UI is updated
    if (refetchClusters) {
      refetchClusters();
    }
  };

  // Expose the refetch function from the parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('refetch-clusters', () => {
        // Force an immediate refetch by reloading the page
        window.location.reload();
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('refetch-clusters', () => {});
      }
    };
  }, []);

  const colors = {
    primary: '#2f86ff',
    primaryLight: '#9ad6f9',
    primaryDark: '#1a65cc',
    secondary: '#67c073',
    white: '#ffffff',
    background: isDark ? '#0f172a' : '#ffffff',
    paper: isDark ? '#1e293b' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    success: '#67c073',
    warning: '#ffb347',
    error: '#ff6b6b',
    disabled: isDark ? '#475569' : '#94a3b8',
  };

  return (
    <div className="p-4" style={{ backgroundColor: colors.background, color: colors.text }}>
      <div className="mb-8">
        <h1
          className="mb-2 flex items-center gap-2 text-3xl font-bold"
          style={{ color: colors.primary }}
        >
          <div>Manage Clusters</div>
          <span
            className="rounded-full px-3 py-1 text-sm"
            style={{
              backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
              color: colors.primary,
            }}
          >
            {clusters.length}
          </span>
        </h1>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          Manage and monitor your Kubernetes clusters
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <TextField
          label="Search Clusters"
          placeholder="Search by name, label, or context"
          value={query}
          onChange={handleSearchChange}
          variant="outlined"
          className="w-full sm:w-1/2 md:w-1/3"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon style={{ color: colors.textSecondary }} />
              </InputAdornment>
            ),
          }}
          InputLabelProps={{
            style: { color: colors.textSecondary },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& input': { color: colors.text },
              '& fieldset': { borderColor: colors.border },
              '&:hover fieldset': { borderColor: colors.primaryLight },
              '&.Mui-focused fieldset': { borderColor: colors.primary },
            },
          }}
        />

        <FormControl className="w-40">
          <InputLabel style={{ color: colors.textSecondary }}>Status Filter</InputLabel>
          <Select
            value={filter}
            label="Status Filter"
            onChange={handleFilterChange}
            sx={{
              backgroundColor: isDark ? '#1e1e2f' : '#fff', // Dropdown field background
              borderRadius: '4px',
              '& .MuiSelect-select': {
                color: colors.text,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.05)',
                gap: '0.5rem',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? '#333' : colors.border,
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: isDark ? colors.primaryLight : colors.primary,
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: colors.primary,
              },
              '& .MuiSelect-icon': {
                color: colors.textSecondary,
              },
              '& .MuiPaper-root': {
                backgroundColor: isDark ? '#2a2a3c' : '#fff',
                color: colors.text,
              },
            }}
            IconComponent={() => (
              <Filter size={18} style={{ color: colors.textSecondary, marginRight: '8px' }} />
            )}
            MenuProps={{
              PaperProps: {
                style: {
                  backgroundColor: isDark ? '#2a2a3c' : '#fff',
                  color: colors.text,
                },
              },
            }}
          >
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="active✓">
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors.success }}
                ></span>
                Active
              </span>
            </MenuItem>
            <MenuItem value="inactive">
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors.error }}
                ></span>
                Inactive
              </span>
            </MenuItem>
            <MenuItem value="pending">
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors.warning }}
                ></span>
                Pending
              </span>
            </MenuItem>
          </Select>
        </FormControl>

        {hasSelectedClusters && (
          <div className="ml-auto flex">
            <Button
              variant="outlined"
              startIcon={<Tag size={16} />}
              endIcon={<KeyboardArrowDownIcon />}
              onClick={handleBulkLabelsClick}
              sx={{
                color: colors.primary,
                borderColor: colors.border,
                '&:hover': {
                  borderColor: colors.primary,
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
                },
                textTransform: 'none',
                fontWeight: '500',
                borderRadius: '8px',
              }}
            >
              Manage Labels
            </Button>
            <Menu
              anchorEl={bulkLabelsAnchorEl}
              open={bulkLabelsMenuOpen}
              onClose={handleBulkLabelsClose}
              MenuListProps={{
                'aria-labelledby': 'bulk-labels-button',
              }}
              PaperProps={{
                sx: {
                  mt: 1,
                  boxShadow: isDark
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  backgroundColor: colors.paper,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                },
              }}
            >
              <MenuItem onClick={handleBulkAddLabels} sx={{ color: colors.text }}>
                <ListItemIcon>
                  <PostAddIcon fontSize="small" style={{ color: colors.primary }} />
                </ListItemIcon>
                <ListItemText>Add Labels</ListItemText>
              </MenuItem>
            </Menu>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => {
              setShowCreateOptions(true);
              setActiveOption('option1');
            }}
            sx={{
              bgcolor: colors.primary,
              color: colors.white,
              '&:hover': { bgcolor: colors.primaryDark },
              textTransform: 'none',
              fontWeight: '600',
              padding: '8px 20px',
              borderRadius: '8px',
              boxShadow: isDark
                ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
                : '0 4px 6px -1px rgba(47, 134, 255, 0.2), 0 2px 4px -2px rgba(47, 134, 255, 0.1)',
            }}
          >
            Import Cluster
          </Button>
          {showCreateOptions && (
            <CreateOptions
              activeOption={activeOption}
              setActiveOption={setActiveOption}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <TableContainer
          component={Paper}
          className="overflow-auto"
          sx={{
            backgroundColor: colors.paper,
            boxShadow: isDark
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  background: colors.primary,
                  '& .MuiTableCell-head': {
                    color: colors.white,
                    fontWeight: 600,
                    padding: '16px',
                    fontSize: '0.95rem',
                  },
                }}
              >
                <TableCell>
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    sx={{
                      color: colors.white,
                      '&.Mui-checked': { color: colors.white },
                    }}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Labels</TableCell>
                <TableCell>Creation Time</TableCell>
                <TableCell>Context</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClusters.length > 0 ? (
                filteredClusters.map(cluster => (
                  <TableRow
                    key={cluster.name}
                    sx={{
                      backgroundColor: colors.paper,
                      '&:hover': {
                        backgroundColor: isDark
                          ? 'rgba(47, 134, 255, 0.08)'
                          : 'rgba(47, 134, 255, 0.04)',
                      },
                      '& .MuiTableCell-body': {
                        color: colors.text,
                        borderColor: colors.border,
                        padding: '12px 16px',
                      },
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedClusters.includes(cluster.name)}
                        onChange={() => handleCheckboxChange(cluster.name)}
                        sx={{
                          color: colors.textSecondary,
                          '&.Mui-checked': { color: colors.primary },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{cluster.name}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(cluster.labels).map(([key, value]) => (
                                <Tooltip
                                  key={`${key}-${value}`}
                                  title="Click to filter by this label"
                                >
                                  <span
                                    onClick={() => handleFilterByLabel(key, value)}
                                    style={{
                                      backgroundColor:
                                        filterByLabel?.key === key && filterByLabel?.value === value
                                          ? isDark
                                            ? 'rgba(47, 134, 255, 0.3)'
                                            : 'rgba(47, 134, 255, 0.15)'
                                          : isDark
                                            ? 'rgba(47, 134, 255, 0.15)'
                                            : 'rgba(47, 134, 255, 0.08)',
                                      color: colors.primary,
                                      border: `1px solid ${
                                        filterByLabel?.key === key && filterByLabel?.value === value
                                          ? colors.primary
                                          : isDark
                                            ? 'rgba(47, 134, 255, 0.4)'
                                            : 'rgba(47, 134, 255, 0.3)'
                                      }`,
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                    className="rounded px-2 py-1 text-xs font-medium hover:shadow-sm"
                                  >
                                    {key}={value}
                                  </span>
                                </Tooltip>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: colors.textSecondary }}>No labels</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cluster.creationTime || cluster.creationTimestamp
                        ? new Date(
                            cluster.creationTime || cluster.creationTimestamp || ''
                          ).toLocaleString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span
                        style={{
                          backgroundColor: isDark
                            ? 'rgba(103, 192, 115, 0.2)'
                            : 'rgba(103, 192, 115, 0.1)',
                          color: isDark ? 'rgb(154, 214, 249)' : 'rgb(47, 134, 255)',
                          border: `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
                        }}
                        className="mx-4 rounded-lg px-2 py-1 text-xs font-medium"
                      >
                        {cluster.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium"
                        style={{
                          backgroundColor:
                            cluster.status === 'Inactive'
                              ? isDark
                                ? 'rgba(255, 107, 107, 0.2)'
                                : 'rgba(255, 107, 107, 0.1)'
                              : cluster.status === 'Pending'
                                ? isDark
                                  ? 'rgba(255, 179, 71, 0.2)'
                                  : 'rgba(255, 179, 71, 0.1)'
                                : isDark
                                  ? 'rgba(103, 192, 115, 0.2)'
                                  : 'rgba(103, 192, 115, 0.1)',
                          color:
                            cluster.status === 'Inactive'
                              ? colors.error
                              : cluster.status === 'Pending'
                                ? colors.warning
                                : colors.success,
                          border:
                            cluster.status === 'Inactive'
                              ? `1px solid ${isDark ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.3)'}`
                              : cluster.status === 'Pending'
                                ? `1px solid ${isDark ? 'rgba(255, 179, 71, 0.4)' : 'rgba(255, 179, 71, 0.3)'}`
                                : `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
                        }}
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              cluster.status === 'Inactive'
                                ? colors.error
                                : cluster.status === 'Pending'
                                  ? colors.warning
                                  : colors.success,
                          }}
                        ></span>
                        {cluster.status || 'Active'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <IconButton
                          aria-label="more"
                          id={`actions-button-${cluster.name}`}
                          aria-controls={
                            anchorElActions[cluster.name]
                              ? `actions-menu-${cluster.name}`
                              : undefined
                          }
                          aria-expanded={anchorElActions[cluster.name] ? 'true' : undefined}
                          onClick={event => handleActionsClick(event, cluster.name)}
                          size="small"
                          style={{
                            color: colors.textSecondary,
                            backgroundColor: isDark
                              ? 'rgba(47, 134, 255, 0.08)'
                              : 'rgba(47, 134, 255, 0.05)',
                          }}
                          className="hover:bg-opacity-80"
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                        <Menu
                          id={`actions-menu-${cluster.name}`}
                          anchorEl={anchorElActions[cluster.name]}
                          open={Boolean(anchorElActions[cluster.name])}
                          onClose={() => handleActionsClose(cluster.name)}
                          MenuListProps={{
                            'aria-labelledby': `actions-button-${cluster.name}`,
                          }}
                          anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                          }}
                          transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                          }}
                          PaperProps={{
                            style: {
                              backgroundColor: colors.paper,
                              border: `1px solid ${colors.border}`,
                              boxShadow: isDark
                                ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
                                : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                              borderRadius: '8px',
                            },
                          }}
                        >
                          <MenuItem
                            onClick={() => handleViewDetails(cluster)}
                            sx={{
                              color: colors.text,
                              '&:hover': {
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <ListItemIcon>
                              <VisibilityIcon fontSize="small" style={{ color: colors.primary }} />
                            </ListItemIcon>
                            <ListItemText>View Details</ListItemText>
                          </MenuItem>
                          <MenuItem
                            onClick={() => {
                              handleEditLabels(cluster);
                              handleActionsClose(cluster.name);
                            }}
                            sx={{
                              color: colors.text,
                              '&:hover': {
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <ListItemIcon>
                              <LabelIcon fontSize="small" style={{ color: colors.primary }} />
                            </ListItemIcon>
                            <ListItemText>Edit Labels</ListItemText>
                          </MenuItem>
                          <MenuItem
                            onClick={() => handleCopyName(cluster.name)}
                            sx={{
                              color: colors.text,
                              '&:hover': {
                                backgroundColor: isDark
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <ListItemIcon>
                              <ContentCopyIcon fontSize="small" style={{ color: colors.primary }} />
                            </ListItemIcon>
                            <ListItemText>Copy Name</ListItemText>
                          </MenuItem>
                          <MenuItem
                            onClick={() => handleDetachCluster(cluster)}
                            sx={{
                              color: colors.error,
                              '&:hover': {
                                backgroundColor: isDark
                                  ? 'rgba(255, 107, 107, 0.1)'
                                  : 'rgba(255, 107, 107, 0.05)',
                              },
                            }}
                          >
                            <ListItemIcon>
                              <LinkOffIcon fontSize="small" style={{ color: colors.error }} />
                            </ListItemIcon>
                            <ListItemText>Detach Cluster</ListItemText>
                          </MenuItem>
                        </Menu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-12">
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <CloudOff
                        size={48}
                        style={{ color: colors.textSecondary, marginBottom: '16px' }}
                      />
                      <h3 style={{ color: colors.text }} className="mb-2 text-lg font-semibold">
                        No Clusters Found
                      </h3>
                      <p style={{ color: colors.textSecondary }} className="mb-4 max-w-md">
                        {query && filter
                          ? 'No clusters match both your search and filter criteria'
                          : query
                            ? 'No clusters match your search term'
                            : filter
                              ? 'No clusters match your filter selection'
                              : 'No clusters available'}
                      </p>
                      {(query || filter) && (
                        <div className="flex gap-2">
                          {query && (
                            <Button
                              onClick={() => setQuery('')}
                              size="small"
                              sx={{
                                color: colors.primary,
                                borderColor: colors.primary,
                                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
                                '&:hover': {
                                  borderColor: colors.primaryLight,
                                  backgroundColor: isDark
                                    ? 'rgba(47, 134, 255, 0.2)'
                                    : 'rgba(47, 134, 255, 0.1)',
                                },
                                textTransform: 'none',
                                fontWeight: '600',
                              }}
                              variant="outlined"
                            >
                              Clear Search
                            </Button>
                          )}
                          {filter && (
                            <Button
                              onClick={() => setFilter('')}
                              size="small"
                              sx={{
                                color: colors.primary,
                                borderColor: colors.primary,
                                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
                                '&:hover': {
                                  borderColor: colors.primaryLight,
                                  backgroundColor: isDark
                                    ? 'rgba(47, 134, 255, 0.2)'
                                    : 'rgba(47, 134, 255, 0.1)',
                                },
                                textTransform: 'none',
                                fontWeight: '600',
                              }}
                              variant="outlined"
                            >
                              Clear Filter
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filterByLabel && (
        <div
          className="mt-4 flex items-center rounded-lg bg-opacity-10 p-2"
          style={{
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
            border: `1px solid ${colors.border}`,
          }}
        >
          <InboxIcon style={{ color: colors.primary, marginRight: '8px' }} fontSize="small" />
          <span style={{ color: colors.textSecondary }}>
            Filtered by label:
            <span style={{ fontWeight: 500, color: colors.primary, margin: '0 4px' }}>
              {filterByLabel.key}={filterByLabel.value}
            </span>
          </span>
          <Button
            size="small"
            onClick={() => setFilterByLabel(null)}
            sx={{
              minWidth: 'auto',
              ml: 2,
              color: colors.textSecondary,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            Clear
          </Button>
        </div>
      )}
      {!isLoading && (
        <div className="mt-6 flex items-center justify-between px-2">
          <Button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            sx={{
              color: currentPage === 1 ? colors.disabled : colors.primary,
              borderColor: currentPage === 1 ? colors.disabled : colors.primary,
              backgroundColor:
                isDark && currentPage !== 1 ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
              '&:hover': {
                borderColor: colors.primaryLight,
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
              },
              '&.Mui-disabled': {
                color: colors.disabled,
                borderColor: colors.disabled,
              },
              textTransform: 'none',
              fontWeight: '600',
              padding: '6px 16px',
              borderRadius: '8px',
            }}
            variant="outlined"
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <span style={{ color: colors.textSecondary }} className="font-medium">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          <Button
            disabled={currentPage === totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            sx={{
              color: currentPage === totalPages ? colors.disabled : colors.primary,
              borderColor: currentPage === totalPages ? colors.disabled : colors.primary,
              backgroundColor:
                isDark && currentPage !== totalPages ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
              '&:hover': {
                borderColor: colors.primaryLight,
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
              },
              '&.Mui-disabled': {
                color: colors.disabled,
                borderColor: colors.disabled,
              },
              textTransform: 'none',
              fontWeight: '600',
              padding: '6px 16px',
              borderRadius: '8px',
            }}
            variant="outlined"
          >
            Next
          </Button>
        </div>
      )}

      <DetachClusterDialog
        open={detachClusterOpen}
        onClose={() => {
          setDetachClusterOpen(false);
          if (loadingClusterDetach) {
            setLoadingClusterDetach(null);
          }
        }}
        cluster={selectedCluster}
        onDetach={handleConfirmDetach}
        isLoading={!!loadingClusterDetach}
        isDark={isDark}
        colors={colors}
      />

      <LabelEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          // Clear the loading state if dialog is closed while operation is in progress
          if (loadingClusterEdit && selectedCluster) {
            setLoadingClusterEdit(null);
          }
        }}
        cluster={selectedCluster}
        onSave={handleSaveLabels}
        isDark={isDark}
        colors={colors}
      />

      <ClusterDetailDialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        clusterName={selectedCluster?.name || null}
        isDark={isDark}
        colors={colors}
      />

      <DetachmentLogsDialog
        open={detachLogsOpen}
        onClose={handleCloseDetachLogs}
        clusterName={selectedCluster?.name || ''}
        isDark={isDark}
        colors={colors}
      />
    </div>
  );
};

export default ClustersTable;
