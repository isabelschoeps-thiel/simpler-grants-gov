import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fakeUserOrganization } from "src/utils/testing/fixtures";
import { useTranslationsMock } from "src/utils/testing/intlMocks";
import { createRef } from "react";

import { StartApplicationModal } from "src/components/workspace/StartApplicationModal/StartApplicationModal";

const mockRouterPush = jest.fn();
const clientFetchMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => useTranslationsMock(),
}));

jest.mock("src/hooks/useClientFetch", () => ({
  useClientFetch: () => ({
    clientFetch: (...args: unknown[]) => clientFetchMock(...args) as unknown,
  }),
}));

describe("StartApplicationModal", () => {
  beforeEach(() => {
    mockRouterPush.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("matches snapshot", () => {
    const { container } = render(
      <StartApplicationModal
        competitionId="1"
        opportunityTitle="blessed opportunity"
        modalRef={createRef()}
        applicantTypes={["organization"]}
        organizations={[fakeUserOrganization]}
        token={"a token"}
        loading={false}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it("displays validation error if submitted without a name", async () => {
    render(
      <StartApplicationModal
        competitionId="1"
        opportunityTitle="blessed opportunity"
        modalRef={createRef()}
        applicantTypes={["individual"]}
        organizations={[]}
        token={"a token"}
        loading={false}
      />
    );

    expect(screen.queryByTestId("errorMessage")).not.toBeInTheDocument();

    const saveButton = await screen.findByTestId("application-start-save");
    act(() => saveButton.click());

    const validationError = await screen.findByTestId("errorMessage");
    expect(validationError).toBeInTheDocument();
  });

  it("displays validation error if submitted without an organization", async () => {
    render(
      <StartApplicationModal
        competitionId="1"
        opportunityTitle="blessed opportunity"
        modalRef={createRef()}
        applicantTypes={["organization"]}
        organizations={[fakeUserOrganization]}
        token={"a token"}
        loading={false}
      />
    );

    expect(screen.queryByTestId("errorMessage")).not.toBeInTheDocument();

    const saveButton = await screen.findByTestId("application-start-save");
    act(() => saveButton.click());

    const validationError = await screen.findByTestId("errorMessage");
    expect(validationError).toBeInTheDocument();
  });

  it("displays an API error if clientFetch fails", async () => {
    clientFetchMock.mockRejectedValue(new Error());

    render(
      <StartApplicationModal
        competitionId="1"
        opportunityTitle="blessed opportunity"
        modalRef={createRef()}
        applicantTypes={["individual"]}
        organizations={[]}
        token={"a token"}
        loading={false}
      />
    );

    const saveButton = await screen.findByTestId("application-start-save");
    const input = await screen.findByTestId("textInput");
    await userEvent.type(input, "new application");

    act(() => saveButton.click());

    const error = await screen.findByTestId("errorMessage");
    expect(error).toBeInTheDocument();
  });

  it("displays a login error if API returns 401", async () => {
    clientFetchMock.mockRejectedValue(new Error("401 error", { cause: "401" }));

    render(
      <StartApplicationModal
        competitionId="1"
        opportunityTitle="blessed opportunity"
        modalRef={createRef()}
        applicantTypes={["individual"]}
        organizations={[]}
        token={"a token"}
        loading={false}
      />
    );

    const saveButton = await screen.findByTestId("application-start-save");
    const input = await screen.findByTestId("textInput");
    await userEvent.type(input, "new application");

    act(() => saveButton.click());

    const loginError = await screen.findByTestId("errorMessage");
    expect(loginError).toBeInTheDocument();
  });

  it("re-routes on successful save", async () => {
    clientFetchMock.mockResolvedValue({ applicationId: "999" });

    render(
      <StartApplicationModal
        competitionId="1"
        opportunityTitle="blessed opportunity"
        modalRef={createRef()}
        applicantTypes={["organization"]}
        organizations={[fakeUserOrganization]}
        token={"a token"}
        loading={false}
      />
    );

    const saveButton = await screen.findByTestId("application-start-save");
    const input = await screen.findByTestId("textInput");
    const select = await screen.findByTestId("Select");

    await userEvent.type(input, "new application");
    await userEvent.selectOptions(select, fakeUserOrganization.organization_id);

    act(() => saveButton.click());

    expect(clientFetchMock).toHaveBeenCalledWith("/api/applications/start", {
      method: "POST",
      body: JSON.stringify({
        applicationName: "new application",
        competitionId: "1",
        organization: fakeUserOrganization.organization_id,
      }),
    });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith(
        `/workspace/applications/application/999`
      );
    });
  });

  it("renders an ineligible view if competition is org only and user has no orgs", () => {
    render(
      <StartApplicationModal
        competitionId="1"
        opportunityTitle="blessed opportunity"
        modalRef={createRef()}
        applicantTypes={["organization"]}
        organizations={[]}
        token={"a token"}
        loading={false}
      />
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("ineligibleTitle")).toBeInTheDocument();
  });
});
