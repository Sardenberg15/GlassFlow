import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AluminumLine, AluminumProfile, Typology, TypologyMaterial } from "@shared/schema";

// ─── Queries ────────────────────────────────────────────────────────────────────

export function useAluminumLines() {
    return useQuery<AluminumLine[]>({
        queryKey: ["/api/aluminum-lines"],
    });
}

export function useAluminumProfiles(lineId?: string) {
    return useQuery<AluminumProfile[]>({
        queryKey: lineId ? [`/api/aluminum-profiles?lineId=${lineId}`] : ["/api/aluminum-profiles"],
    });
}

export function useTypologies() {
    return useQuery<Typology[]>({
        queryKey: ["/api/typologies"],
    });
}

export function useTypologyMaterials(typologyId: string) {
    return useQuery<TypologyMaterial[]>({
        queryKey: [`/api/typologies/${typologyId}/materials`],
        enabled: !!typologyId,
    });
}

export function useAllTypologyMaterials() {
    return useQuery<TypologyMaterial[]>({
        queryKey: ["/api/typology-materials"],
    });
}

// ─── Aluminum Lines Mutations ───────────────────────────────────────────────────

export function useCreateAluminumLine() {
    return useMutation({
        mutationFn: async (line: Partial<AluminumLine>) => {
            const res = await apiRequest("POST", "/api/aluminum-lines", line);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-lines"] });
        },
    });
}

export function useUpdateAluminumLine() {
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<AluminumLine> & { id: string }) => {
            const res = await apiRequest("PATCH", `/api/aluminum-lines/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-lines"] });
        },
    });
}

export function useDeleteAluminumLine() {
    return useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/aluminum-lines/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-lines"] });
        },
    });
}

// ─── Aluminum Profiles Mutations ────────────────────────────────────────────────

export function useCreateAluminumProfile() {
    return useMutation({
        mutationFn: async (profile: Partial<AluminumProfile>) => {
            const res = await apiRequest("POST", "/api/aluminum-profiles", profile);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-profiles"] });
        },
    });
}

export function useUpdateAluminumProfile() {
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<AluminumProfile> & { id: string }) => {
            const res = await apiRequest("PATCH", `/api/aluminum-profiles/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-profiles"] });
        },
    });
}

export function useDeleteAluminumProfile() {
    return useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/aluminum-profiles/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/aluminum-profiles"] });
        },
    });
}

// ─── Typology Mutations ─────────────────────────────────────────────────────────

export function useCreateTypology() {
    return useMutation({
        mutationFn: async (typology: Partial<Typology>) => {
            const res = await apiRequest("POST", "/api/typologies", typology);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
        },
    });
}

export function useUpdateTypology() {
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<Typology> & { id: string }) => {
            const res = await apiRequest("PATCH", `/api/typologies/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
        },
    });
}

export function useDeleteTypology() {
    return useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/typologies/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/typologies"] });
        },
    });
}

// ─── Typology Materials Mutations ───────────────────────────────────────────────

export function useCreateTypologyMaterial() {
    return useMutation({
        mutationFn: async (material: Partial<TypologyMaterial>) => {
            const res = await apiRequest("POST", "/api/typology-materials", material);
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [`/api/typologies/${variables.typologyId}/materials`] });
            queryClient.invalidateQueries({ queryKey: ["/api/typology-materials"] });
        },
    });
}

export function useUpdateTypologyMaterial() {
    return useMutation({
        mutationFn: async ({ id, ...data }: Partial<TypologyMaterial> & { id: string }) => {
            const res = await apiRequest("PATCH", `/api/typology-materials/${id}`, data);
            return res.json();
        },
        onSuccess: (_, variables) => {
            // Invalidate all material queries since we may not know typologyId
            queryClient.invalidateQueries({ queryKey: ["/api/typology-materials"] });
            if (variables.typologyId) {
                queryClient.invalidateQueries({ queryKey: [`/api/typologies/${variables.typologyId}/materials`] });
            }
        },
    });
}

export function useDeleteTypologyMaterial() {
    return useMutation({
        mutationFn: async ({ id, typologyId }: { id: string; typologyId: string }) => {
            await apiRequest("DELETE", `/api/typology-materials/${id}`);
            return { typologyId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [`/api/typologies/${data.typologyId}/materials`] });
            queryClient.invalidateQueries({ queryKey: ["/api/typology-materials"] });
        },
    });
}
