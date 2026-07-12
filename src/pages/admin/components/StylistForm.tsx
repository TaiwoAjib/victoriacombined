import { UseFormReturn } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { Style } from "@/services/styleService";

interface StylistFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  editingStylist: any;
  availableStyles: Style[];
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function StylistForm({ form, onSubmit, isSubmitting, editingStylist, availableStyles }: StylistFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jane@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="123 Salon St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="skillLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Skill Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Master">Master</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           
           <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{editingStylist ? "New Password (Optional)" : "Password"}</FormLabel>
                <FormControl>
                  <Input type="password" placeholder={editingStylist ? "Leave blank to keep current" : "******"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {form.watch("fullName")?.toLowerCase().includes("victoria") && (
            <FormField
              control={form.control}
              name="surcharge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surcharge ($)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <DialogDescription>Extra fee applied to bookings for this stylist (Victoria only).</DialogDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {editingStylist && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Active Status</FormLabel>
                  <DialogDescription>
                    Stylist can accept bookings and login
                  </DialogDescription>
                </div>
                <FormControl>
                  <div className="flex items-center space-x-2">
                     <Button
                       type="button"
                       variant={field.value ? "default" : "outline"}
                       size="sm"
                       onClick={() => field.onChange(true)}
                       className={field.value ? "bg-green-600 hover:bg-green-700" : ""}
                     >
                       Active
                     </Button>
                     <Button
                       type="button"
                       variant={!field.value ? "destructive" : "outline"}
                       size="sm"
                       onClick={() => field.onChange(false)}
                       className={!field.value ? "bg-red-600 hover:bg-red-700" : ""}
                     >
                       Inactive
                     </Button>
                  </div>
                </FormControl>
              </FormItem>
            )}
        />
        )}

        <FormField
          control={form.control}
          name="styleIds"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Capable Styles</FormLabel>
                <DialogDescription>
                  Select the styles this stylist can perform.
                </DialogDescription>
              </div>
              <div className="grid grid-cols-2 gap-2 border p-4 rounded-md h-40 overflow-y-auto">
                {availableStyles.map((style) => (
                  <FormField
                    key={style.id}
                    control={form.control}
                    name="styleIds"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={style.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(style.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...(field.value || []), style.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value: string) => value !== style.id
                                      )
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {style.name}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Working Hours Section */}
        <div className="space-y-4 pt-4 border-t">
            <div className="mb-2">
              <FormLabel className="text-base">Working Hours</FormLabel>
              <DialogDescription>
                 Set specific working days and hours (overrides salon defaults).
              </DialogDescription>
            </div>
            <div className="space-y-2 border p-4 rounded-md">
              {DAYS.map((day) => (
                 <div key={day} className="flex items-center space-x-4">
                    <FormField
                      control={form.control}
                      name={`workingHours.${day}.isOpen`}
                      render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0 w-32">
                              <FormControl>
                                  <Checkbox 
                                  checked={field.value ?? true} // Default to open if undefined
                                  onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      if (checked) {
                                          const startName = `workingHours.${day}.start` as const;
                                          const endName = `workingHours.${day}.end` as const;
                                          // @ts-ignore
                                          if (!form.getValues(startName)) form.setValue(startName, "09:00");
                                          // @ts-ignore
                                          if (!form.getValues(endName)) form.setValue(endName, "22:00");
                                      }
                                  }}
                              />
                              </FormControl>
                              <FormLabel className="capitalize font-medium">{day}</FormLabel>
                          </FormItem>
                      )}
                    />
                    
                    {(form.watch(`workingHours.${day}.isOpen`) ?? true) && (
                        <>
                          <FormField
                              control={form.control}
                              name={`workingHours.${day}.start`}
                              defaultValue="09:00"
                              render={({ field }) => (
                                  <FormItem className="space-y-0">
                                      <FormControl>
                                          <Input type="time" className="w-24 h-8" {...field} />
                                      </FormControl>
                                  </FormItem>
                              )}
                          />
                          <span className="text-muted-foreground">-</span>
                          <FormField
                              control={form.control}
                              name={`workingHours.${day}.end`}
                              defaultValue="22:00"
                              render={({ field }) => (
                                  <FormItem className="space-y-0">
                                      <FormControl>
                                          <Input type="time" className="w-24 h-8" {...field} />
                                      </FormControl>
                                  </FormItem>
                              )}
                          />
                        </>
                    )}
                 </div>
              ))}
            </div>
        </div>

        {form.watch("fullName")?.toLowerCase().includes("victoria") && form.watch("styleIds")?.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="mb-2">
              <FormLabel className="text-base">Style-Specific Surcharges</FormLabel>
              <DialogDescription>
                 Set specific surcharge amounts for each style. Leave 0.00 to use the global surcharge.
              </DialogDescription>
            </div>
            <div className="grid grid-cols-2 gap-4 max-h-40 overflow-y-auto p-1">
              {availableStyles
                .filter(s => form.watch("styleIds")?.includes(s.id))
                .map(style => (
                  <FormField
                    key={`surcharge-${style.id}`}
                    control={form.control}
                    name={`styleSurcharges.${style.id}`}
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-normal truncate block" title={style.name}>
                          {style.name}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value ?? ""} 
                            onChange={(e) => {
                                const val = e.target.value;
                                const parsed = parseFloat(val);
                                // Treat empty string or 0 as undefined to use global surcharge
                                field.onChange((val === "" || parsed === 0) ? undefined : parsed);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="submit" className="bg-gold hover:bg-gold-dark text-white" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              editingStylist ? "Update Stylist" : "Create Stylist"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
