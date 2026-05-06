// In its own file to avoid circular dependencies
export const FILE_EDIT_TOOL_NAME = 'Edit'

// Permission pattern for granting session-level access to the project's .kairos/ folder
export const kairos_FOLDER_PERMISSION_PATTERN = '/.kairos/**'

// Permission pattern for granting session-level access to the global ~/.kairos/ folder
export const GLOBAL_kairos_FOLDER_PERMISSION_PATTERN = '~/.kairos/**'

export const FILE_UNEXPECTEDLY_MODIFIED_ERROR =
  'File has been unexpectedly modified. Read it again before attempting to write it.'
