// Mock implementations for missing Radix UI components
// These provide basic functionality to allow the app to run

export const ToastProvider = ({ children }: any) => children;
export const ToastViewport = () => null;
export const Toast = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ToastTitle = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ToastDescription = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const ToastClose = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const ToastAction = ({ children, ...props }: any) => <button {...props}>{children}</button>;

export const TooltipProvider = ({ children }: any) => children;
export const Tooltip = ({ children }: any) => children;
export const TooltipTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const TooltipContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Tabs = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const TabsList = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const TabsTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const TabsContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Slider = ({ value, onValueChange, ...props }: any) => (
  <input 
    type="range" 
    value={value?.[0] || 0} 
    onChange={(e) => onValueChange?.([parseInt(e.target.value)])}
    {...props}
  />
);

export const Label = ({ children, ...props }: any) => <label {...props}>{children}</label>;

export const Select = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const SelectTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const SelectContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const SelectItem = ({ children, value, ...props }: any) => <option value={value} {...props}>{children}</option>;
export const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>;

export const Checkbox = ({ checked, onCheckedChange, ...props }: any) => (
  <input 
    type="checkbox" 
    checked={checked} 
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...props}
  />
);

export const Dialog = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const DialogTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const DialogContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const DialogHeader = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const DialogTitle = ({ children, ...props }: any) => <h2 {...props}>{children}</h2>;
export const DialogDescription = ({ children, ...props }: any) => <p {...props}>{children}</p>;

export const DropdownMenu = ({ children }: any) => children;
export const DropdownMenuTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const DropdownMenuContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;
export const DropdownMenuItem = ({ children, ...props }: any) => <button {...props}>{children}</button>;

export const Popover = ({ children }: any) => children;
export const PopoverTrigger = ({ children, ...props }: any) => <button {...props}>{children}</button>;
export const PopoverContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

export const Separator = (props: any) => <hr {...props} />;

export const Switch = ({ checked, onCheckedChange, ...props }: any) => (
  <input 
    type="checkbox" 
    checked={checked} 
    onChange={(e) => onCheckedChange?.(e.target.checked)}
    {...props}
  />
);

export const Progress = ({ value, ...props }: any) => (
  <progress value={value} max={100} {...props} />
);
