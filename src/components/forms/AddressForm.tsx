'use client';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Alert from '@mui/material/Alert';
import { addressSchema } from '@/schemas';
import { fieldErrors, post, put } from '@/lib/api-client';
import type { Address } from '@/types/domain';

type Values = z.input<typeof addressSchema>;

export default function AddressForm({ address, onSaved, onCancel }: { address?: Address; onSaved: (a: Address) => void; onCancel?: () => void }) {
  const [error, setError] = useState('');
  const { register, handleSubmit, control, setError: setFieldError, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? { label: address.label ?? '', fullName: address.fullName, phone: address.phone, line1: address.line1, line2: address.line2 ?? '', city: address.city, state: address.state, postalCode: address.postalCode, country: 'IN', gstin: address.gstin ?? '', isDefaultShipping: address.isDefaultShipping, isDefaultBilling: address.isDefaultBilling }
      : { country: 'IN', isDefaultShipping: false, isDefaultBilling: false },
  });
  const f = (name: keyof Values, label: string, extra: object = {}) => (
    <TextField label={label} error={Boolean(errors[name])} helperText={errors[name]?.message as string | undefined} {...register(name as never)} {...extra} />
  );
  return (
    <Box component="form" noValidate onSubmit={handleSubmit(async (v) => {
      setError('');
      try {
        const saved = address ? await put<Address>(`/api/users/addresses/${address.id}`, v) : await post<Address>('/api/users/addresses', v);
        onSaved(saved);
      } catch (e) {
        const fe = fieldErrors(e);
        Object.entries(fe).forEach(([k, m]) => setFieldError(k as never, { message: m }));
        if (!Object.keys(fe).length) setError(e instanceof Error ? e.message : 'Could not save address');
      }
    })} sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      {error && <Alert severity="error" sx={{ gridColumn: '1 / -1' }}>{error}</Alert>}
      {f('fullName', 'Full name', { autoComplete: 'name' })}
      {f('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel' })}
      <Box sx={{ gridColumn: '1 / -1', display: 'grid', gap: 2 }}>
        {f('line1', 'Address line 1', { autoComplete: 'address-line1' })}
        {f('line2', 'Address line 2 (optional)', { autoComplete: 'address-line2' })}
      </Box>
      {f('city', 'City', { autoComplete: 'address-level2' })}
      {f('state', 'State', { autoComplete: 'address-level1' })}
      {f('postalCode', 'PIN code', { inputMode: 'numeric', autoComplete: 'postal-code' })}
      {f('gstin', 'GSTIN (optional, for business billing)')}
      {f('label', 'Label (e.g. Factory, Office)')}
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', columnGap: 3 }}>
        <Controller name="isDefaultShipping" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Default shipping address" />} />
        <Controller name="isDefaultBilling" control={control} render={({ field }) => <FormControlLabel control={<Checkbox checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />} label="Default billing address" />} />
      </Box>
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
        <Button type="submit" variant="contained" disabled={isSubmitting}>{address ? 'Save changes' : 'Save address'}</Button>
      </Box>
    </Box>
  );
}
