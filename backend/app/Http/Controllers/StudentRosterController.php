<?php

namespace App\Http\Controllers;

use App\DTOs\RawFileData;
use App\Modules\CoreDataStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentRosterController extends Controller
{
    public function __construct(
        private readonly CoreDataStorage $storage
    ) {}

    /**
     * Endpoint to upload and import student roster.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file',
        ]);

        $uploadedFile = $request->file('file');
        $content = file_get_contents($uploadedFile->getRealPath());
        $fileName = $uploadedFile->getClientOriginalName();
        $extension = $uploadedFile->getClientOriginalExtension();

        $fileData = new RawFileData(
            content: $content,
            fileName: $fileName,
            extension: $extension
        );

        $summary = $this->storage->importStudentRoster($fileData);

        return response()->json([
            'success' => $summary->isSuccessful,
            'data' => [
                'totalProcessed' => $summary->totalProcessed,
                'successful' => $summary->successful,
                'skipped' => $summary->skipped,
                'observations' => $summary->observations,
                'failedRows' => $summary->failedRows,
                'metadata' => $summary->metadata,
                'isSuccessful' => $summary->isSuccessful,
            ],
            'message' => $summary->isSuccessful
                ? ($summary->skipped > 0 ? 'Nómina procesada con observaciones.' : 'Student roster processed successfully.')
                : 'Failed to process student roster.',
        ], $summary->isSuccessful ? 200 : 422);
    }

    /**
     * Endpoint to download official roster template.
     */
    public function template(Request $request): \Illuminate\Http\Response
    {
        $content = $this->storage->generateCsvTemplate();

        return response($content, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="plantilla_nomina_estudiantes.csv"',
        ]);
    }
}
